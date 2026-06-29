from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from datetime import date
from app.database import get_db
from app.models import UserJobRecommendation, JobListing
from app.dependencies import get_current_user
from app.services.job_recommender import generate_daily_recommendations

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.get("/recommendations")
async def get_recommendations(
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    today = date.today()

    # Get cv_data from user's latest CV. This assumes user has cvs loaded
    # Since user object might not have cv_data directly, we'll fetch their latest CV
    from app.models import CV
    latest_cv = db.query(CV).filter_by(user_id=user.id).order_by(CV.updated_at.desc()).first()
    cv_data = {}
    if latest_cv:
        cv_data = {
            "jobTitle": latest_cv.title or "",
            "skills": [s.get("name", "") for s in (latest_cv.skills or []) if isinstance(s, dict)] if isinstance(latest_cv.skills, list) else latest_cv.skills,
            "yearsExp": len(latest_cv.experiences or []),
            "location": latest_cv.location or "germany"
        }

    # Trigger generation in background if not done today
    background_tasks.add_task(
        generate_daily_recommendations, user.id, cv_data
    )

    recs = db.query(UserJobRecommendation).join(JobListing).filter(
        UserJobRecommendation.user_id        == user.id,
        UserJobRecommendation.recommended_on == today,
        UserJobRecommendation.is_dismissed   == False
    ).order_by(UserJobRecommendation.match_score.desc()).all()

    grouped = {}
    for rec in recs:
        company = rec.job.company or "Unknown"
        grouped.setdefault(company, []).append({
            "id":           rec.id,
            "title":        rec.job.title,
            "company":      rec.job.company,
            "location":     rec.job.location,
            "url":          rec.job.url,
            "salary_min":   rec.job.salary_min,
            "salary_max":   rec.job.salary_max,
            "match_score":  float(rec.match_score or 0),
            "match_reasons": rec.match_reasons or [],
            "is_saved":     rec.is_saved,
            "is_applied":   rec.is_applied,
        })

    return {"grouped_by_company": grouped, "total": len(recs), "date": str(today)}

@router.patch("/recommendations/{rec_id}/action")
async def job_action(
    rec_id:  str,
    payload: dict,   # { "action": "save" | "dismiss" | "apply" }
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    rec = db.query(UserJobRecommendation).filter_by(
        id=rec_id, user_id=user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404)
    action = payload.get("action")
    if action == "save":     rec.is_saved     = True
    if action == "dismiss":  rec.is_dismissed = True
    if action == "apply":
        rec.is_applied = True
        rec.job.apply_count = (rec.job.apply_count or 0) + 1
    db.commit()
    return {"status": "updated"}
