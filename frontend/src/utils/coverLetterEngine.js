/**
 * coverLetterEngine.js
 * ────────────────────────────────────────────────────────────────────────────
 * 100% client-side cover letter generation.
 * No API calls. Uses JD keyword extraction + CV data interpolation.
 *
 * generateCoverLetter(cvData, jobDescription) → string
 */

// ─── Stop words ───────────────────────────────────────────────────────────────
const STOP = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','are','was','were','be','been','will','would','could','should',
  'this','that','these','those','it','we','you','he','she','they','as','if',
  'our','your','their','has','have','had','do','does','did','not','no','can',
  'may','must','shall','all','also','more','than','its','any','each','about',
  'into','over','after','before','during','through','between','such','only',
  'both','other','some','most','just','like','very','well','then','up','out',
]);

// ─── Detect JD tone ──────────────────────────────────────────────────────────
function detectTone(jd) {
  const lower = jd.toLowerCase();
  const startupMarkers = ['fast-paced','startup','move fast','ship','iterate','founding','seed','series a','series b','scrappy','hustle','agile team','small team'];
  const creativeMarkers = ['creative','design','brand','storytelling','campaign','content','aesthetic','visual','portfolio'];
  const corporateMarkers = ['enterprise','stakeholders','cross-functional','alignment','strategy','governance','compliance','fiscal','quarter','roi','kpi','p&l','matrix'];
  const scores = {
    startup: startupMarkers.filter(m => lower.includes(m)).length,
    creative: creativeMarkers.filter(m => lower.includes(m)).length,
    corporate: corporateMarkers.filter(m => lower.includes(m)).length,
  };
  const max = Math.max(scores.startup, scores.creative, scores.corporate);
  if (max === 0) return 'professional';
  if (scores.startup === max) return 'startup';
  if (scores.creative === max) return 'creative';
  return 'corporate';
}

// ─── Extract top JD keywords ──────────────────────────────────────────────────
function extractJDKeywords(jd, limit = 8) {
  if (!jd) return [];
  const words = jd.toLowerCase()
    .replace(/[^a-z0-9\s\-+#]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP.has(w));
  // Count frequency
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

// ─── Extract role name from JD ────────────────────────────────────────────────
function extractRoleFromJD(jd) {
  if (!jd) return null;
  const lines = jd.split('\n').map(l => l.trim()).filter(Boolean);
  // First non-empty line is usually the role title
  const firstLine = lines[0] || '';
  if (firstLine.length < 80) return firstLine;
  // Or look for "We are hiring a [role]" pattern
  const match = jd.match(/(?:hiring|looking for|seeking)\s+(?:a|an)?\s+([A-Z][^.!?]{5,50})/);
  if (match) return match[1].trim();
  return null;
}

// ─── Extract company from JD ──────────────────────────────────────────────────
function extractCompanyFromJD(jd) {
  if (!jd) return null;
  const match = jd.match(/(?:at|join|@)\s+([A-Z][A-Za-z0-9\s&]{2,30})(?:\s+is|\s+are|\s+we|[,.])/);
  if (match) return match[1].trim();
  return null;
}

// ─── Get top experience bullet points from CV ─────────────────────────────────
function getTopExperiences(cvData, jdKeywords, limit = 3) {
  const bullets = [];
  const exps = cvData.experiences || [];
  for (const exp of exps) {
    const desc = exp.description || '';
    const role = exp.role || exp.position || '';
    const company = exp.company || '';
    // Extract bullet lines
    const lines = desc.split('\n').filter(l => l.trim().length > 15);
    for (const line of lines) {
      const clean = line.replace(/^[•\-\*]\s*/, '').replace(/\*\*/g, '').replace(/_/g, '').trim();
      if (clean.length > 20) {
        const relevance = jdKeywords.filter(kw => clean.toLowerCase().includes(kw)).length;
        bullets.push({ text: clean, relevance, role, company });
      }
    }
    // Also add a general "worked at X as Y" if no bullets
    if (lines.length === 0 && (role || company)) {
      bullets.push({ text: `delivered results as ${role}${company ? ' at ' + company : ''}`, relevance: 0, role, company });
    }
  }
  // Sort by relevance to JD, take top limit
  bullets.sort((a, b) => b.relevance - a.relevance);
  return bullets.slice(0, limit).map(b => b.text);
}

// ─── Get skills list ──────────────────────────────────────────────────────────
function getSkillsList(cvData, limit = 5) {
  const skills = cvData.skills || [];
  return skills
    .map(s => typeof s === 'string' ? s : s?.name || '')
    .filter(Boolean)
    .slice(0, limit)
    .join(', ');
}

// ─── Today's date formatted ───────────────────────────────────────────────────
function formatDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Tone-appropriate opener phrases ─────────────────────────────────────────
const OPENERS = {
  startup: [
    "After following {company}'s trajectory closely, the {role} opening stood out immediately.",
    "When {company}'s {role} role came up, I knew it was worth a direct conversation.",
    "The {role} position at {company} caught my attention for one clear reason: the work matters.",
  ],
  creative: [
    "Good work has a quality that's hard to define but easy to recognize — I saw that quality in {company}.",
    "The {role} role at {company} aligns precisely with the type of work I find most compelling.",
    "Creative organizations attract me for the same reason {company} does: conviction in craft.",
  ],
  corporate: [
    "The {role} role at {company} presents an opportunity well aligned with my professional focus.",
    "Organizations like {company} attract my attention when the role and the mission intersect — and they do here.",
    "Having tracked {company}'s growth in this space, the {role} opening is a natural conversation to initiate.",
  ],
  professional: [
    "The {role} position at {company} aligns directly with the expertise I've built over my career.",
    "Few roles announce themselves as clearly as this {role} opening at {company}.",
    "My background maps closely to what {company} is building with the {role} role.",
  ],
};

// ─── Tone-appropriate closing phrases ─────────────────────────────────────────
const CLOSINGS = {
  startup: "My availability is flexible and I am ready to move quickly. A short call to discuss the specifics would be mutually efficient.",
  creative: "I welcome the opportunity to show you examples of work that speak more clearly than a letter can. A brief conversation would be a good starting point.",
  corporate: "I would welcome the opportunity to discuss how my background aligns with your team's objectives in more detail at your convenience.",
  professional: "I am available for a conversation at your convenience and would welcome the opportunity to discuss this role further.",
};

// ─── Main generator ──────────────────────────────────────────────────────────
/**
 * @param {Object} cvData   – parsed CV from state
 * @param {string} jobDescription – raw JD text pasted by user
 * @returns {string} formatted cover letter text
 */
export function generateCoverLetter(cvData, jobDescription) {
  const pi = cvData?.personal_info || {};
  const name = pi.name || cvData?.full_name || 'Candidate';
  const email = pi.email || cvData?.email || '';
  const phone = pi.phone || cvData?.phone || '';
  const jobTitle = pi.jobTitle || pi.title || cvData?.title || 'Professional';
  const location = pi.location || '';

  const jd = jobDescription || '';
  const tone = detectTone(jd);
  const jdKeywords = extractJDKeywords(jd, 10);
  const targetRole = extractRoleFromJD(jd) || jobTitle;
  const company = extractCompanyFromJD(jd) || 'your organisation';
  const skills = getSkillsList(cvData, 6);
  const topBullets = getTopExperiences(cvData, jdKeywords, 3);
  const date = formatDate();

  // ─── Opener ───────────────────────────────────────────────────────────────
  const openers = OPENERS[tone] || OPENERS.professional;
  const opener = openers[Math.floor(Math.random() * openers.length)]
    .replace(/{role}/g, targetRole)
    .replace(/{company}/g, company);

  // ─── Value proposition ────────────────────────────────────────────────────
  const skillStr = skills || 'a breadth of relevant technical and professional skills';
  const valueProposition = `With ${jobTitle.toLowerCase() !== 'professional' ? jobTitle.toLowerCase() + ' experience' : 'a cross-functional background'} and expertise across ${skillStr}, my work consistently delivers results that compound over time — not one-off deliverables.`;

  // ─── Body paragraph 1: achievements ──────────────────────────────────────
  let achievementPara = '';
  if (topBullets.length >= 2) {
    const b1 = topBullets[0];
    const b2 = topBullets[1];
    const b3 = topBullets[2];
    achievementPara = `In my previous roles, ${b1.charAt(0).toLowerCase() + b1.slice(1)}. ${b2.charAt(0).toUpperCase() + b2.slice(1)}.${b3 ? ` ${b3.charAt(0).toUpperCase() + b3.slice(1)}.` : ''} These outcomes reflect a consistent pattern: taking ownership of complex problems and shipping solutions that hold up under real-world conditions.`;
  } else if (topBullets.length === 1) {
    achievementPara = `Across my work, ${topBullets[0].charAt(0).toLowerCase() + topBullets[0].slice(1)}. I take ownership of outcomes rather than tasks, which means the impact I contribute tends to compound beyond the initial scope of any project.`;
  } else {
    achievementPara = `My approach centres on taking clear ownership of outcomes and building solutions that remain maintainable as requirements evolve. That combination of precision and long-term thinking has consistently enabled me to add value across different team structures and problem domains.`;
  }

  // ─── Body paragraph 2: cultural fit ──────────────────────────────────────
  const cultureParagraphs = {
    startup: `Teams that move fast still need people who think carefully before acting — and who can tell the difference between moving quickly and moving rashly. I bring both velocity and judgement, and I work best when there is room to own outcomes end-to-end rather than hand off at every stage.`,
    creative: `Quality in creative work depends on the willingness to stay in the problem longer than is comfortable. My working style reflects that — I resist the temptation of the first-pass answer and tend to advocate for solutions that work at the level of detail, not just the concept.`,
    corporate: `Collaboration across functions is only effective when each participant brings clarity about their own scope and genuine curiosity about others'. I make a point of building those cross-functional relationships early, which has reduced friction and shortened decision cycles in every team I have been part of.`,
    professional: `The most effective contributors in any organisation are those who make the people around them more effective too. Throughout my career, I have prioritised clear communication, shared documentation, and mentorship alongside my individual output — because the leverage from those investments compounds.`,
  };
  const culturePara = cultureParagraphs[tone] || cultureParagraphs.professional;

  // ─── Closing ─────────────────────────────────────────────────────────────
  const closing = CLOSINGS[tone] || CLOSINGS.professional;

  // ─── Assemble letter ──────────────────────────────────────────────────────
  const headerLines = [name, [email, phone, location].filter(Boolean).join('  |  '), date].filter(Boolean);

  const letter = [
    headerLines.join('\n'),
    '',
    'Dear Hiring Team,',
    '',
    `${opener} ${valueProposition}`,
    '',
    achievementPara,
    '',
    culturePara,
    '',
    closing,
    '',
    `Sincerely,\n${name}`,
  ].join('\n');

  return letter;
}

export default generateCoverLetter;
