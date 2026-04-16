/**
 * atsEngine.js — 100% client-side ATS scoring engine
 *
 * scoreResume(resumeText, jobDescription)
 * ────────────────────────────────────────
 * Returns: {
 *   total          : 0-100,
 *   tier           : 'red' | 'yellow' | 'green',
 *   breakdown      : { keywords, skills, completeness, formatting },
 *   missingKeywords: string[],
 *   matchedKeywords: string[],
 *   suggestions    : string[],
 *   weakSections   : string[],
 * }
 *
 * Scoring weights:
 *   Keyword match rate   40 pts
 *   Required skills      25 pts
 *   Section completeness 20 pts
 *   Formatting safety    15 pts
 */

// ─── Stop-word list (common English + German words to ignore) ─────────────────
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','shall','must',
  'not','no','nor','so','yet','both','either','neither','than','that','this',
  'these','those','it','its','i','we','you','he','she','they','them','their',
  'our','your','my','his','her','as','if','when','while','after','before',
  'since','until','because','although','though','unless','whereas','whether',
  // German stop words
  'der','die','das','des','dem','den','ein','eine','einer','einem','einen',
  'und','oder','aber','in','an','auf','bei','mit','nach','von','zu','zur',
  'ist','sind','war','hat','haben','wird','werden','wurde','können','kann',
  'sich','auch','für','als','um','aus','wie','noch','über','unter','so',
  'im','am','ins','ans','eine','einer','einem','wir','sie','es','ich','du',
]);

// ─── Technical / professional skill keywords (for skills coverage check) ────────
const TECH_KEYWORDS = new Set([
  // Languages
  'python','javascript','typescript','java','c++','c#','ruby','go','golang',
  'kotlin','swift','scala','rust','php','r','matlab','bash','sql','html','css',
  // Frameworks / libs
  'react','angular','vue','node','express','django','flask','spring','rails',
  'fastapi','nextjs','nuxtjs','gatsby','svelte','laravel',
  // Cloud & DevOps
  'aws','azure','gcp','docker','kubernetes','terraform','ci/cd','jenkins',
  'github actions','ansible','helm','linux','git',
  // Databases
  'postgresql','mysql','mongodb','redis','elasticsearch','sqlite','oracle',
  'dynamodb','cassandra','neo4j',
  // Data / AI
  'machine learning','deep learning','nlp','tensorflow','pytorch','keras',
  'pandas','numpy','scikit-learn','spark','hadoop','airflow','dbt',
  // Design / UX
  'figma','sketch','adobe','ux','ui','wireframe',
  // Management
  'agile','scrum','kanban','jira','confluence','product management','stakeholder',
  // Generic professional
  'communication','leadership','teamwork','problem solving','analytical',
  'project management','strategy','roadmap',
]);

// ─── Key section names ATS parsers look for ──────────────────────────────────
const REQUIRED_SECTIONS = {
  summary: ['summary', 'profile', 'objective', 'about', 'profil', 'zusammenfassung'],
  experience: ['experience', 'work', 'employment', 'berufserfahrung', 'tätigkeiten'],
  skills: ['skills', 'technologies', 'competencies', 'fähigkeiten', 'kenntnisse'],
  education: ['education', 'academic', 'qualification', 'bildung', 'ausbildung'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9#+./\-\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function extractPhrases(text, maxLen = 3) {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const phrases = new Set();
  for (let i = 0; i < words.length; i++) {
    for (let l = 1; l <= maxLen; l++) {
      if (i + l <= words.length) {
        const phrase = words.slice(i, i + l).join(' ').replace(/[^a-z0-9#+./\-\s]/g, '').trim();
        if (phrase.length > 2) phrases.add(phrase);
      }
    }
  }
  return phrases;
}

function extractKeywords(jd) {
  const tokens = tokenize(jd);
  const phrases = extractPhrases(jd, 3);
  const keywords = new Set(tokens.filter(t => !STOP_WORDS.has(t)));
  // Add multi-word tech phrases that appear in the JD
  for (const phrase of phrases) {
    if (TECH_KEYWORDS.has(phrase)) keywords.add(phrase);
  }
  return keywords;
}

// ─── Score: keyword match rate (40 pts) ──────────────────────────────────────
function scoreKeywords(resumeText, jdKeywords) {
  if (jdKeywords.size === 0) return { score: 40, matched: [], missing: [] };
  const resumeLower = resumeText.toLowerCase();
  const matched = [];
  const missing = [];
  for (const kw of jdKeywords) {
    if (resumeLower.includes(kw)) matched.push(kw);
    else missing.push(kw);
  }
  const rate = matched.length / jdKeywords.size;
  return {
    score: Math.round(rate * 40),
    matched,
    missing,
  };
}

// ─── Score: required skills coverage (25 pts) ─────────────────────────────────
function scoreSkills(resumeText, jdKeywords) {
  const resumeLower = resumeText.toLowerCase();
  const jdTechSkills = [...jdKeywords].filter(k => TECH_KEYWORDS.has(k));
  if (jdTechSkills.length === 0) return { score: 25, found: [], missing: [] };
  const found = jdTechSkills.filter(s => resumeLower.includes(s));
  const missing = jdTechSkills.filter(s => !resumeLower.includes(s));
  const rate = found.length / jdTechSkills.length;
  return {
    score: Math.round(rate * 25),
    found,
    missing,
  };
}

// ─── Score: section completeness (20 pts) ────────────────────────────────────
function scoreSections(cvData) {
  const sectionKeys = Object.keys(REQUIRED_SECTIONS);
  let present = 0;
  const missing = [];

  for (const key of sectionKeys) {
    let found = false;
    if (key === 'summary') {
      found = !!(cvData?.personal_info?.summary || cvData?.profile_summary || '').trim();
    } else if (key === 'experience') {
      found = (cvData?.experiences || []).length > 0;
    } else if (key === 'skills') {
      found = (cvData?.skills || []).length > 0;
    } else if (key === 'education') {
      found = (cvData?.educations || []).length > 0;
    }
    if (found) present++;
    else missing.push(key.charAt(0).toUpperCase() + key.slice(1));
  }

  return {
    score: Math.round((present / sectionKeys.length) * 20),
    presentCount: present,
    totalCount: sectionKeys.length,
    missingSections: missing,
  };
}

// ─── Score: formatting safety (15 pts) ───────────────────────────────────────
function scoreFormatting(cvData, theme) {
  let score = 15;
  const issues = [];

  // Using a non-ATS layout with columns/sidebar loses points
  if (theme?.layout === 'modern' || theme?.layout === 'executive') {
    score -= 6;
    issues.push('Multi-column layout may confuse ATS parsers — try ATS-Safe template');
  }
  if (theme?.layout === 'classic') {
    score -= 2;
    issues.push('Color header banner may not parse cleanly — try ATS-Safe or Minimal');
  }

  // Tables / images in custom sections
  const customSections = cvData?.custom_sections || [];
  const hasTable = customSections.some(cs => (cs.content || '').includes('|'));
  if (hasTable) {
    score -= 4;
    issues.push('Table formatting in custom sections is not ATS-friendly');
  }

  return { score: Math.max(0, score), issues };
}

// ─── Generate improvement suggestions ────────────────────────────────────────
function buildSuggestions(keywordResult, skillResult, sectionResult, formattingResult) {
  const suggestions = [];

  if (keywordResult.missing.length > 0) {
    const topMissing = keywordResult.missing.slice(0, 5).join(', ');
    suggestions.push(`Add these missing JD keywords to your resume: ${topMissing}`);
  }

  if (skillResult.missing.length > 0) {
    suggestions.push(`Include required skills: ${skillResult.missing.slice(0, 4).join(', ')}`);
  }

  if (sectionResult.missingSections.length > 0) {
    suggestions.push(`Add missing sections: ${sectionResult.missingSections.join(', ')}`);
  }

  formattingResult.issues.forEach(i => suggestions.push(i));

  if (keywordResult.score < 20) {
    suggestions.push('Rewrite bullet points using language from the job description');
  }

  if (suggestions.length === 0) {
    suggestions.push('Great match! Fine-tune bullet point language to mirror the job description.');
  }

  return suggestions;
}

// ─── Identify weak sections ───────────────────────────────────────────────────
function findWeakSections(cvData, jdKeywords) {
  const weak = [];
  const resumeTextBySection = {
    Summary: (cvData?.personal_info?.summary || '').toLowerCase(),
    Experience: (cvData?.experiences || []).map(e => (e.description || '') + ' ' + (e.position || '')).join(' ').toLowerCase(),
    Skills: (cvData?.skills || []).map(s => typeof s === 'string' ? s : s?.name || '').join(' ').toLowerCase(),
    Education: (cvData?.educations || []).map(e => (e.degree || '') + ' ' + (e.field || '')).join(' ').toLowerCase(),
  };

  const criticalKws = [...jdKeywords].slice(0, 20);

  for (const [section, text] of Object.entries(resumeTextBySection)) {
    const hits = criticalKws.filter(kw => text.includes(kw)).length;
    const ratio = criticalKws.length > 0 ? hits / criticalKws.length : 1;
    if (ratio < 0.2 && text.length > 0) {
      weak.push(section);
    }
  }

  return weak;
}

// ─── Main export ─────────────────────────────────────────────────────────────
/**
 * @param {string} jobDescription   Raw JD text pasted by user
 * @param {Object} cvData           The cvData object from state
 * @param {Object} theme            The theme object from state
 * @returns {Object} ATS analysis result
 */
export function scoreResume(jobDescription, cvData, theme = {}) {
  if (!jobDescription?.trim()) {
    return {
      total: 0, tier: 'red',
      breakdown: { keywords: 0, skills: 0, completeness: 0, formatting: 0 },
      missingKeywords: [], matchedKeywords: [],
      suggestions: ['Paste a job description to get your ATS score'],
      weakSections: [],
    };
  }

  // Build resume plain text for matching
  const pi = cvData?.personal_info || {};
  const resumeText = [
    pi.name, pi.jobTitle, pi.title, pi.summary,
    ...(cvData?.experiences || []).flatMap(e => [e.position, e.role, e.company, e.description]),
    ...(cvData?.educations || []).flatMap(e => [e.degree, e.field, e.institution]),
    ...(cvData?.skills || []).map(s => typeof s === 'string' ? s : s?.name || ''),
    ...(cvData?.certifications || []).map(c => c.name),
    ...(cvData?.projects || []).flatMap(p => [p.name, p.description]),
    ...(cvData?.custom_sections || []).map(cs => cs.content),
  ].filter(Boolean).join(' ');

  const jdKeywords = extractKeywords(jobDescription);
  const keywordResult = scoreKeywords(resumeText, jdKeywords);
  const skillResult = scoreSkills(resumeText, jdKeywords);
  const sectionResult = scoreSections(cvData);
  const formattingResult = scoreFormatting(cvData, theme);

  const total = Math.min(100,
    keywordResult.score + skillResult.score + sectionResult.score + formattingResult.score
  );

  const tier = total >= 76 ? 'green' : total >= 50 ? 'yellow' : 'red';

  // Deduplicate missing keywords (include skill misses too)
  const missingSet = new Set([...keywordResult.missing, ...skillResult.missing]);
  const missingKeywords = [...missingSet].slice(0, 20);

  return {
    total,
    tier,
    breakdown: {
      keywords: keywordResult.score,
      keywordsMax: 40,
      skills: skillResult.score,
      skillsMax: 25,
      completeness: sectionResult.score,
      completenessMax: 20,
      formatting: formattingResult.score,
      formattingMax: 15,
      sectionDetails: sectionResult,
    },
    missingKeywords,
    matchedKeywords: keywordResult.matched.slice(0, 30),
    suggestions: buildSuggestions(keywordResult, skillResult, sectionResult, formattingResult),
    weakSections: findWeakSections(cvData, jdKeywords),
  };
}

export default scoreResume;
