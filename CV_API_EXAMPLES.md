# CV API Examples - Updated Schema

## Complete Example: Creating and Using CVs with the New Schema

### 1. Create a New CV

**Request:**
```bash
curl -X POST http://localhost:8000/api/cvs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Ravindra Sharma",
    "title": "Senior Software Engineer",
    "email": "ravindra@example.com",
    "phone": "+977-1234567890",
    "location": "Kathmandu, Nepal",
    "linkedin_url": "https://linkedin.com/in/ravindra",
    "profile_summary": "Experienced database administrator and software engineer with expertise in cloud platforms and full-stack development.",
    "education": [
      {
        "degree": "Masters Degree",
        "field_of_study": "Philosophy and Computer Science",
        "institution_name": "Universität Bayreuth",
        "location": "Germany",
        "start_date": "2025-10-01",
        "end_date": null,
        "status": "Present"
      },
      {
        "degree": "B.Sc.",
        "field_of_study": "Informatik und Informationstechnologie",
        "institution_name": "Tribhuvan University",
        "location": "Kathmandu, Nepal",
        "start_date": "2017-10-01",
        "end_date": "2021-12-01",
        "final_project": "Offensive Content Detection System mit Naïve Bayes"
      }
    ],
    "experience": [
      {
        "job_title": "Datenbankadministrator",
        "company_name": "Vanilla Transtechnor Pvt. Ltd.",
        "location": "Kathmandu, Nepal",
        "start_date": "2022-06-01",
        "end_date": "2025-01-01",
        "responsibilities": [
          "Managed MS SQL Always On",
          "MySQL Group Replication",
          "PostgreSQL Streaming Replication",
          "MongoDB Replica Sets",
          "Designed ETL pipelines",
          "Performance tuning",
          "Collaboration with DevOps teams"
        ]
      },
      {
        "job_title": "Software Developer Praktikant",
        "company_name": "Vanilla Transtechnor Pvt. Ltd.",
        "location": "Kathmandu, Nepal",
        "start_date": "2022-04-01",
        "end_date": "2024-06-01",
        "responsibilities": [
          ".NET backend development",
          "Vue.js & React.js frontend",
          "Agile sprint participation"
        ]
      }
    ],
    "skills": {
      "programming": ["Python", "SQL", "Bash", "C#", "ASP.NET", "JS", "PHP"],
      "cloud": ["AWS", "GCP", "Azure", "Docker"],
      "databases": ["MS SQL Server", "MySQL", "PostgreSQL", "MongoDB", "MariaDB"],
      "tools": ["Power BI", "Tableau", "Git", "Conda"],
      "management": ["Scrum", "Leadership", "Incident Management"]
    },
    "languages": [
      { "language": "Nepali", "level": "Native" },
      { "language": "German", "level": "B2" },
      { "language": "English", "level": "Professional" },
      { "language": "Hindi", "level": "Professional" }
    ],
    "certifications": [
      {
        "name": "Kubernetes for Developers",
        "issuer": "Linux Foundation",
        "issue_date": "2024-01-15",
        "expiry_date": null,
        "credential_url": "https://credentials.linuxfoundation.org/..."
      }
    ],
    "projects": [
      {
        "name": "Offensive Content Detection System",
        "description": "Machine learning system for detecting harmful content",
        "technologies": ["Python", "Naïve Bayes", "NLP"],
        "start_date": "2020-01-01",
        "end_date": "2021-12-01",
        "link": "https://github.com/example/offensive-content-detection"
      }
    ],
    "interests": ["Artificial Intelligence", "Cloud Architecture", "DevOps", "Open Source"],
    "current_version": 1
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "full_name": "Ravindra Sharma",
  "title": "Senior Software Engineer",
  "email": "ravindra@example.com",
  "phone": "+977-1234567890",
  "location": "Kathmandu, Nepal",
  "linkedin_url": "https://linkedin.com/in/ravindra",
  "profile_summary": "Experienced database administrator and software engineer with expertise in cloud platforms and full-stack development.",
  "education": [
    {
      "degree": "Masters Degree",
      "field_of_study": "Philosophy and Computer Science",
      "institution_name": "Universität Bayreuth",
      "location": "Germany",
      "start_date": "2025-10-01",
      "status": "Present"
    },
    {
      "degree": "B.Sc.",
      "field_of_study": "Informatik und Informationstechnologie",
      "institution_name": "Tribhuvan University",
      "location": "Kathmandu, Nepal",
      "start_date": "2017-10-01",
      "end_date": "2021-12-01",
      "final_project": "Offensive Content Detection System mit Naïve Bayes"
    }
  ],
  "experience": [
    {
      "job_title": "Datenbankadministrator",
      "company_name": "Vanilla Transtechnor Pvt. Ltd.",
      "location": "Kathmandu, Nepal",
      "start_date": "2022-06-01",
      "end_date": "2025-01-01",
      "responsibilities": ["Managed MS SQL Always On", "MySQL Group Replication", ...]
    },
    {
      "job_title": "Software Developer Praktikant",
      "company_name": "Vanilla Transtechnor Pvt. Ltd.",
      "location": "Kathmandu, Nepal",
      "start_date": "2022-04-01",
      "end_date": "2024-06-01",
      "responsibilities": [".NET backend development", "Vue.js & React.js frontend", ...]
    }
  ],
  "skills": {
    "programming": ["Python", "SQL", "Bash", "C#", "ASP.NET", "JS", "PHP"],
    "cloud": ["AWS", "GCP", "Azure", "Docker"],
    "databases": ["MS SQL Server", "MySQL", "PostgreSQL", "MongoDB", "MariaDB"],
    "tools": ["Power BI", "Tableau", "Git", "Conda"],
    "management": ["Scrum", "Leadership", "Incident Management"]
  },
  "languages": [
    { "language": "Nepali", "level": "Native" },
    { "language": "German", "level": "B2" },
    { "language": "English", "level": "Professional" },
    { "language": "Hindi", "level": "Professional" }
  ],
  "certifications": [
    {
      "name": "Kubernetes for Developers",
      "issuer": "Linux Foundation",
      "issue_date": "2024-01-15",
      "credential_url": "https://credentials.linuxfoundation.org/..."
    }
  ],
  "projects": [
    {
      "name": "Offensive Content Detection System",
      "description": "Machine learning system for detecting harmful content",
      "technologies": ["Python", "Naïve Bayes", "NLP"],
      "start_date": "2020-01-01",
      "end_date": "2021-12-01",
      "link": "https://github.com/example/offensive-content-detection"
    }
  ],
  "interests": ["Artificial Intelligence", "Cloud Architecture", "DevOps", "Open Source"],
  "current_version": 1,
  "created_at": "2025-02-20T10:30:00",
  "updated_at": "2025-02-20T10:30:00"
}
```

---

### 2. Get All CVs

**Request:**
```bash
curl -X GET http://localhost:8000/api/cvs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": 1,
    "full_name": "Ravindra Sharma",
    "title": "Senior Software Engineer",
    ...
  },
  {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "user_id": 1,
    "full_name": "Second Resume",
    ...
  }
]
```

---

### 3. Get Specific CV

**Request:**
```bash
curl -X GET http://localhost:8000/api/cvs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "full_name": "Ravindra Sharma",
  ...
}
```

---

### 4. Update CV

**Request:**
```bash
curl -X PUT http://localhost:8000/api/cvs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Ravindra Sharma",
    "title": "Lead Software Architect",
    "profile_summary": "Updated summary with new information",
    "skills": {
      "programming": ["Python", "SQL", "Bash", "C#", "ASP.NET", "JS", "PHP", "Go"],
      "cloud": ["AWS", "GCP", "Azure", "Docker", "Kubernetes"],
      "databases": ["MS SQL Server", "MySQL", "PostgreSQL", "MongoDB", "MariaDB", "Redis"],
      "tools": ["Power BI", "Tableau", "Git", "Conda", "Jenkins"],
      "management": ["Scrum", "Leadership", "Incident Management", "Team Mentoring"]
    }
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "full_name": "Ravindra Sharma",
  "title": "Lead Software Architect",
  "profile_summary": "Updated summary with new information",
  "skills": {
    "programming": ["Python", "SQL", "Bash", "C#", "ASP.NET", "JS", "PHP", "Go"],
    "cloud": ["AWS", "GCP", "Azure", "Docker", "Kubernetes"],
    ...
  },
  "updated_at": "2025-02-20T11:00:00"
}
```

---

### 5. Upload CV File

**Request:**
```bash
curl -X POST http://localhost:8000/api/cvs/550e8400-e29b-41d4-a716-446655440000/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@resume.pdf"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 1,
  "full_name": "Ravindra Sharma",
  "title": "resume",
  "education": [
    {
      "degree": "Masters Degree",
      "field_of_study": "Philosophy and Computer Science",
      ...
    }
  ],
  "experience": [...],
  "skills": {...},
  ...
}
```

---

### 6. Customize CV for Job Description

**Request:**
```bash
curl -X POST http://localhost:8000/api/cvs/550e8400-e29b-41d4-a716-446655440000/customize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_description": "We are looking for a Senior DevOps Engineer with 5+ years of experience. Requirements: AWS/GCP/Azure, Kubernetes, Docker, CI/CD pipelines, Infrastructure as Code (Terraform), Python/Go scripting. Strong communication and team collaboration skills required."
  }'
```

**Response:**
```json
{
  "id": 42,
  "cv_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_description": "We are looking for a Senior DevOps Engineer...",
  "score": 85,
  "suggestions": [
    {
      "id": 1,
      "title": "AI Recommendations",
      "description": "Based on CV analysis",
      "suggestion": "Enhance experience descriptions with metrics | Add more cloud certifications",
      "section": "general",
      "is_applied": false,
      "created_at": "2025-02-20T12:00:00"
    },
    {
      "id": 2,
      "title": "Cloud Skills",
      "description": "Job requires cloud platform experience",
      "suggestion": "Highlight any AWS, Azure, or GCP experience you have",
      "section": "skills",
      "is_applied": false,
      "created_at": "2025-02-20T12:00:00"
    }
  ]
}
```

---

### 7. Enhance CV for Job

**Request:**
```bash
curl -X POST http://localhost:8000/api/cvs/550e8400-e29b-41d4-a716-446655440000/enhance-for-job \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_description": "Senior DevOps Engineer position with focus on Kubernetes and AWS infrastructure management."
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "CV successfully enhanced for the job description",
  "enhanced_cv": {
    "full_name": "Ravindra Sharma",
    "email": "ravindra@example.com",
    "profile_summary": "Results-driven DevOps Engineer with 5+ years of experience designing, implementing, and managing scalable cloud infrastructure on AWS and Kubernetes platforms...",
    "experience": [
      {
        "job_title": "Datenbankadministrator",
        "company_name": "Vanilla Transtechnor Pvt. Ltd.",
        "responsibilities": [
          "Architected and managed Kubernetes clusters supporting 50+ microservices deployments",
          "Implemented AWS infrastructure using Terraform, reducing provisioning time by 60%",
          "Designed CI/CD pipelines using Jenkins, resulting in 10x faster release cycles",
          ...
        ]
      }
    ],
    ...
  }
}
```

---

### 8. Get Suggestions for CV

**Request:**
```bash
curl -X GET http://localhost:8000/api/cvs/550e8400-e29b-41d4-a716-446655440000/suggestions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "AI Recommendations",
    "description": "Based on CV analysis",
    "suggestion": "Enhance experience descriptions with metrics | Add more cloud certifications",
    "section": "general",
    "is_applied": false,
    "created_at": "2025-02-20T12:00:00"
  },
  {
    "id": 2,
    "title": "Cloud Skills",
    "description": "Job requires cloud platform experience",
    "suggestion": "Highlight any AWS, Azure, or GCP experience you have",
    "section": "skills",
    "is_applied": false,
    "created_at": "2025-02-20T12:00:00"
  }
]
```

---

### 9. Apply Suggestion

**Request:**
```bash
curl -X POST http://localhost:8000/api/cvs/550e8400-e29b-41d4-a716-446655440000/suggestions/1/apply \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "message": "Suggestion applied successfully",
  "suggestion": {
    "id": 1,
    "title": "AI Recommendations",
    "description": "Based on CV analysis",
    "suggestion": "Enhance experience descriptions with metrics | Add more cloud certifications",
    "section": "general",
    "is_applied": true,
    "created_at": "2025-02-20T12:00:00"
  }
}
```

---

### 10. Delete CV

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/cvs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "message": "CV deleted successfully"
}
```

---

## Data Structure Reference

### Skills Object Structure
```json
{
  "programming": ["Python", "JavaScript", "Go", "Rust"],
  "cloud": ["AWS", "GCP", "Azure", "Docker", "Kubernetes"],
  "databases": ["PostgreSQL", "MongoDB", "Redis"],
  "tools": ["Git", "Jenkins", "Terraform"],
  "management": ["Scrum", "Leadership"]
}
```

### Education Array Structure
```json
[
  {
    "degree": "Master's Degree",
    "field_of_study": "Computer Science",
    "institution_name": "MIT",
    "location": "Cambridge, MA",
    "start_date": "2020-09-01",
    "end_date": "2022-05-15",
    "status": "Completed",
    "final_project": "AI-powered code generation system"
  }
]
```

### Experience Array Structure
```json
[
  {
    "job_title": "Senior Software Engineer",
    "company_name": "Tech Corp",
    "location": "San Francisco, CA",
    "start_date": "2022-06-01",
    "end_date": null,
    "responsibilities": [
      "Led team of 5 engineers",
      "Reduced API latency by 40%",
      "Mentored junior developers"
    ]
  }
]
```

### Languages Array Structure
```json
[
  {
    "language": "English",
    "level": "Professional"
  },
  {
    "language": "Spanish",
    "level": "Fluent"
  },
  {
    "language": "Mandarin",
    "level": "B1"
  }
]
```

---

## Error Responses

### 404 - CV Not Found
```json
{
  "detail": "CV not found"
}
```

### 400 - Bad Request
```json
{
  "detail": "Invalid input data"
}
```

### 500 - Server Error
```json
{
  "detail": "Failed to parse CV file: Unsupported file format"
}
```

---

## Notes

- All CV IDs are now **UUID v4** format (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Dates should be in ISO 8601 format: `YYYY-MM-DD`
- All arrays and objects support nested structures
- The `current_version` field tracks CV versions for change management
- JSON fields (education, experience, skills, etc.) support flexible schemas
