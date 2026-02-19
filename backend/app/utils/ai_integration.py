"""
AI Integration Module
Handles LLM API calls for CV enhancement and cover letter generation
Uses Groq API (free tier available)
"""

import os
import json
import requests
from typing import Optional, Dict, List
from bs4 import BeautifulSoup

# Groq API endpoint
GROQ_API = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


class LLMProvider:
    """Handles communication with Groq API"""
    
    @staticmethod
    def generate_cover_letter(cv_data: Dict, job_description: str, user_name: str) -> str:
        """Generate a cover letter using Groq API"""
        try:
            prompt = f"""Based on this CV data and job description, write a professional cover letter:

CV Summary:
- Name: {user_name}
- Experience: Professional background in relevant fields

Job Description:
{job_description}

Write a compelling, personalized cover letter (300-400 words):"""

            response = LLMProvider._groq_request(prompt)
            if not response:
                response = LLMProvider._generate_basic_cover_letter(cv_data, job_description, user_name)
            
            return response if response else "Unable to generate cover letter. Please try again."
            
        except Exception as e:
            print(f"Error generating cover letter: {str(e)}")
            return LLMProvider._generate_basic_cover_letter(cv_data, job_description, user_name)
    
    @staticmethod
    def _groq_request(prompt: str) -> Optional[str]:
        """Call Groq API"""
        try:
            if not GROQ_API_KEY:
                print("Groq API key not configured")
                return None
            
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "gemma2-9b-it",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1024,
                "temperature": 0.7
            }
            
            response = requests.post(GROQ_API, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            else:
                print(f"Groq API error: {response.status_code}")
                return None
            
        except Exception as e:
            print(f"Groq API error: {str(e)}")
            return None
    
    @staticmethod
    def _generate_basic_cover_letter(cv_data: Dict, job_description: str, user_name: str) -> str:
        """Fallback: Generate basic cover letter using templates"""
        return f"""Dear Hiring Manager,

I am writing to express my strong interest in the position described in your job posting. With my professional background and experience, I am confident in my ability to contribute effectively to your team.

Throughout my career, I have developed expertise in several key areas that align with your requirements. My experience has equipped me with the technical skills and professional qualities necessary to excel in this role.

I am particularly drawn to this opportunity because it combines my passion for innovation with the chance to work on meaningful projects. I am excited about the prospect of bringing my skills and dedication to your organization.

Thank you for considering my application. I look forward to discussing how I can contribute to your team's success.

Sincerely,
{user_name}"""


class JobDescriptionExtractor:
    """Extracts job description from URLs using web scraping"""
    
    @staticmethod
    def extract_from_url(url: str) -> Optional[str]:
        """Extract job description from LinkedIn or Indeed URLs"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            text = soup.get_text()
            return text[:2000] if text else None
            
        except Exception as e:
            print(f"Error extracting job description: {str(e)}")
            return None


class CVAnalyzer:
    """Analyzes CV content and generates enhancements using Groq API"""
    
    @staticmethod
    def analyze_cv(cv_data: Dict) -> Dict:
        """Analyze CV and generate insights using Groq API"""
        try:
            personal_info = cv_data.get('personal_info', {})
            experiences = cv_data.get('experiences', [])
            educations = cv_data.get('educations', [])
            skills = cv_data.get('skills', [])
            
            # Extract skill names
            skill_names = []
            for skill in skills:
                if isinstance(skill, dict):
                    skill_names.append(skill.get('name', ''))
                else:
                    skill_names.append(str(skill))
            
            cv_summary = f"""
Name: {personal_info.get('name', 'Not provided')}
Skills: {', '.join(skill_names[:10])}
Experience: {len(experiences)} positions
Education: {len(educations)} degrees
"""
            
            prompt = f"""Analyze this CV and provide insights in JSON format with 'strengths' (list), 'improvements' (list), and 'score' (0-100):

CV Summary:
{cv_summary}

Respond with ONLY valid JSON:
{{"strengths": ["..."], "improvements": ["..."], "score": 75}}
"""
            
            response = LLMProvider._groq_request(prompt)
            if response:
                try:
                    response_clean = response.replace('```json', '').replace('```', '').strip()
                    analysis = json.loads(response_clean)
                    return {'analysis': analysis, 'status': 'success'}
                except json.JSONDecodeError:
                    return {
                        'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 75},
                        'status': 'parse_error'
                    }
            
            return {
                'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 0},
                'status': 'api_error'
            }
            
        except Exception as e:
            return {
                'analysis': {'strengths': [], 'improvements': [], 'score': 0},
                'status': 'error',
                'error': str(e)
            }
    
    @staticmethod
    def enhance_cv_for_job(cv_data: Dict, job_description: str) -> Dict:
        """Create enhanced CV tailored to job description"""
        try:
            experiences = cv_data.get('experiences', [])
            
            # Create experience summary
            exp_summary = "\n".join([
                f"- {e.get('position', '')} at {e.get('company', '')} ({e.get('startDate', '')} to {e.get('endDate', '')})"
                for e in experiences[:3]
            ])
            
            prompt = f"""Based on this job description, optimize the CV experiences to match the role better.
Return JSON with 'enhanced_descriptions' array of improved experience descriptions:

Job Description:
{job_description[:1000]}

Current Experiences:
{exp_summary}

Improve each to highlight relevant skills. Return ONLY JSON:
{{"enhanced_descriptions": ["description1", "description2"]}}
"""
            
            response = LLMProvider._groq_request(prompt)
            if response:
                try:
                    response_clean = response.replace('```json', '').replace('```', '').strip()
                    enhanced = json.loads(response_clean)
                    
                    # Build enhanced CV data
                    enhanced_cv = cv_data.copy()
                    if 'enhanced_descriptions' in enhanced and enhanced_cv.get('experiences'):
                        for i, desc in enumerate(enhanced['enhanced_descriptions']):
                            if i < len(enhanced_cv['experiences']):
                                enhanced_cv['experiences'][i]['description'] = desc
                    
                    return {'enhanced_cv': enhanced_cv, 'status': 'success'}
                except json.JSONDecodeError:
                    return {'enhanced_cv': cv_data, 'status': 'parse_error'}
            
            return {'enhanced_cv': cv_data, 'status': 'api_error'}
            
        except Exception as e:
            return {'enhanced_cv': cv_data, 'status': 'error', 'error': str(e)}


# Convenience functions
def generate_cover_letter(cv_data: Dict, job_description: str, user_name: str) -> str:
    """Generate a cover letter"""
    return LLMProvider.generate_cover_letter(cv_data, job_description, user_name)


def extract_job_description(url: str) -> Optional[str]:
    """Extract job description from URL"""
    return JobDescriptionExtractor.extract_from_url(url)


def analyze_cv(cv_data: Dict) -> Dict:
    """Analyze CV using Groq API"""
    return CVAnalyzer.analyze_cv(cv_data)


def enhance_cv_for_job(cv_data: Dict, job_description: str) -> Dict:
    """Create enhanced CV for specific job"""
    return CVAnalyzer.enhance_cv_for_job(cv_data, job_description)
