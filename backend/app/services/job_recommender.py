import httpx, json
from datetime import date
from app.models import JobListing, UserJobRecommendation
from app.services.settings_service import get_setting

async def fetch_jobs_adzuna(keywords: str, location: str, db) -> list:
    app_id  = get_setting("ADZUNA_APP_ID",  db)
    app_key = get_setting("ADZUNA_APP_KEY", db)
    if not app_id or not app_key:
        return []
    params = {
        "app_id":           app_id,
        "app_key":          app_key,
        "what":             keywords,
        "results_per_page": 20,
        "content-type":     "application/json"
    }
    if location and location.lower() != "germany":
        params["where"] = location

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.adzuna.com/v1/api/jobs/de/search/1",
                params=params
            )
        return r.json().get("results", [])
    except Exception:
        return []

async def fetch_jobs_jsearch(keywords: str, location: str, db) -> list:
    api_key = get_setting("JSEARCH_API_KEY", db)
    if not api_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://jsearch.p.rapidapi.com/search",
                params={"query": f"{keywords} in {location}", "num_pages": "1"},
                headers={"X-RapidAPI-Key": api_key,
                         "X-RapidAPI-Host": "jsearch.p.rapidapi.com"}
            )
        jobs = r.json().get("data", [])
        # Normalise JSearch shape to match Adzuna shape
        return [
            {
                "id":          j.get("job_id"),
                "title":       j.get("job_title"),
                "company":     {"display_name": j.get("employer_name")},
                "location":    {"display_name": j.get("job_city")},
                "redirect_url": j.get("job_apply_link"),
                "description": j.get("job_description", "")[:1000],
                "salary_min":  j.get("job_min_salary"),
                "salary_max":  j.get("job_max_salary"),
                "source":      "jsearch"
            }
            for j in jobs
        ]
    except Exception:
        return []

async def score_job(job: dict, cv_data: dict, db) -> tuple:
    """Score job vs CV using AI. Returns (score: float, reasons: list)."""
    from app.services.ai_service import call_ai   # reuse existing AI wrapper
    prompt = f"""
Score this job against the candidate CV. Return ONLY valid JSON.
Format: {{"score": 85, "reasons": ["skill match: Python", "title match"]}}
Score 0-100. No preamble.

CV: title={cv_data.get('jobTitle')}, skills={cv_data.get('skills', [])[:5]},
    experience={cv_data.get('yearsExp')} years

Job: title={job.get('title')}, company={(job.get('company') or {}).get('display_name')},
     description={str(job.get('description',''))[:400]}
"""
    try:
        result = await call_ai(prompt, db)
        data   = json.loads(result)
        return float(data.get("score", 50)), data.get("reasons", [])
    except Exception:
        return 50.0, []

async def generate_daily_recommendations(user_id: str, cv_data: dict):
    """Fetch, score, and save top 10 jobs for today. Skips if already done."""
    from sqlalchemy.orm import Session
    from app.database import engine
    
    with Session(engine) as db:
        today = date.today()

        count = db.query(UserJobRecommendation).filter(
            UserJobRecommendation.user_id        == user_id,
            UserJobRecommendation.recommended_on == today
        ).count()

        if count >= 10:
            return  # already generated today

        from app.models import User
        user = db.query(User).filter_by(id=user_id).first()
        prefs = user.job_preferences if user and user.job_preferences else {}
        
        pref_title    = prefs.get("preferred_job_position", "")
        pref_location = prefs.get("location", "")
        pref_others   = prefs.get("other_elements", "")
        
        title    = pref_title if pref_title else cv_data.get("jobTitle", "")
        skills   = pref_others if pref_others else " ".join(cv_data.get("skills", [])[:5])
        location = pref_location if pref_location else cv_data.get("location", "germany")
        
        keywords = f"{title} {skills}".strip()
        if not keywords:
            keywords = "Software Developer"

        # Try Adzuna first, fallback to JSearch
        jobs = await fetch_jobs_adzuna(keywords, location, db)
        if not jobs:
            jobs = await fetch_jobs_jsearch(keywords, location, db)
        if not jobs:
            return

        scored = []
        for job in jobs:
            score, reasons = await score_job(job, cv_data, db)
            scored.append((job, score, reasons))

        top10 = sorted(scored, key=lambda x: x[1], reverse=True)[:10]

        for job, score, reasons in top10:
            source = job.get("source", "adzuna")
            ext_id = str(job.get("id", ""))

            listing = db.query(JobListing).filter_by(
                source=source, external_id=ext_id
            ).first()

            if not listing:
                listing = JobListing(
                    external_id = ext_id,
                    source      = source,
                    title       = job.get("title", ""),
                    company     = job.get("company", {}).get("display_name", ""),
                    location    = job.get("location", {}).get("display_name", ""),
                    url         = job.get("redirect_url", ""),
                    description = str(job.get("description", ""))[:2000],
                    salary_min  = job.get("salary_min"),
                    salary_max  = job.get("salary_max"),
                )
                db.add(listing)
                db.flush()

            existing_rec = db.query(UserJobRecommendation).filter_by(
                user_id=user_id, job_id=listing.id, recommended_on=today
            ).first()
            
            if not existing_rec:
                db.add(UserJobRecommendation(
                    user_id        = user_id,
                    job_id         = listing.id,
                    match_score    = score,
                    match_reasons  = reasons,
                    recommended_on = today
                ))

        db.commit()
