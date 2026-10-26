// Character pools for the live room. Industry x attitude x hidden situation x trigger x dealbreaker are combined
// at random, so no two practice calls play the same way. Ported from Pitch Room and made product-neutral.
import type { Judge, Prospect } from "./judge";

export const CATEGORIES: Record<string, { label: string; style: string; moments: string[] }> = {
  trades: { label: "Trades & home services", style: 'Casual and plain-spoken: short sentences, a little everyday slang ("yeah no", "honestly", "man"). Not into corporate talk; warms up to someone who is straight with them.', moments: ["driving between job sites with the phone on speaker", "on a lunch break in the truck", "on a job site with equipment running nearby", "doing invoices at the kitchen table after work"] },
  appointments: { label: "Appointment-based", style: "Friendly but harried, juggling the phone, walk-ins and the schedule. Polite and practical; talks about patients or clients and the schedule.", moments: ["at the front desk with someone waiting to check in", "between appointments", "just before opening for the day", "covering the phones while short-staffed"] },
  professional: { label: "Professional services", style: "Polished and measured, chooses words carefully, cautious about confidentiality, contracts and liability. Wants to know who the caller is and how they got the number.", moments: ["between client meetings", "at the desk reviewing files", "about to step into a call"] },
  tech: { label: "Tech & product companies", style: "Articulate and quick, comfortable with jargon, asks detailed follow-ups: how it works, integrations, who owns the data, pricing model, metrics, case studies. Gets bored by vague claims.", moments: ["between meetings", "working remotely from a coffee shop", "right after a product demo"] },
  retail: { label: "Retail & food", style: "Busy and practical, thinks about foot traffic, regulars and weekends. Warm with people but distracted by customers in front of them.", moments: ["during the lunch rush", "restocking before opening", "closing out the register"] },
};

const INDUSTRIES: { cat: string; type: string; names: string[]; roles: string[] }[] = [
  { cat: "trades", type: "landscaping company", names: ["Greenline Lawn & Landscape", "Palmetto Cut Lawn Care"], roles: ["the owner", "the owner, who also runs a crew"] },
  { cat: "trades", type: "roofing contractor", names: ["Peak Line Roofing", "Coastal Crown Roofing"], roles: ["the owner, who started the company 15 years ago"] },
  { cat: "trades", type: "plumbing company", names: ["Riverline Plumbing", "Northside Drain & Pipe"], roles: ["the owner", "the co-owner, who runs the office side"] },
  { cat: "trades", type: "HVAC company", names: ["Coastline Air & Heat", "Sunrise Comfort HVAC"], roles: ["the owner, a former technician"] },
  { cat: "trades", type: "auto repair shop", names: ["Sandbar Auto Repair", "Eastside Auto & Tire"], roles: ["the owner, a mechanic himself", "the owner"] },
  { cat: "trades", type: "moving company", names: ["Launch Day Movers", "Two Rivers Moving Co."], roles: ["the owner"] },
  { cat: "appointments", type: "dental office", names: ["Riverside Smiles Dental", "Seabreeze Family Dentistry"], roles: ["the dentist who owns the practice"] },
  { cat: "appointments", type: "hair salon", names: ["Salt & Shear Studio", "Velvet Room Salon"], roles: ["the owner, who is also a stylist"] },
  { cat: "appointments", type: "boutique fitness studio", names: ["Tidal Strength Studio", "Pulse Cycle Club"], roles: ["the owner"] },
  { cat: "appointments", type: "veterinary clinic", names: ["Willow Creek Animal Hospital", "Paws & Palms Vet"], roles: ["the veterinarian who owns the practice"] },
  { cat: "appointments", type: "tutoring center", names: ["Bright Path Tutoring", "Summit Learning Lab"], roles: ["the director who owns the center"] },
  { cat: "professional", type: "law firm", names: ["Harmon & Reyes Law", "Coastal Legal Group"], roles: ["the founding attorney"] },
  { cat: "professional", type: "accounting firm", names: ["Waterside CPA Group", "Ledger & Lane Tax"], roles: ["the CPA who owns the firm"] },
  { cat: "professional", type: "independent insurance agency", names: ["Harbor Point Insurance", "Seacrest Insurance Group"], roles: ["the agency owner"] },
  { cat: "professional", type: "real estate team", names: ["Shoreline Realty Team", "Atlantic Key Realty"], roles: ["the broker who owns the team"] },
  { cat: "tech", type: "B2B software startup", names: ["Orbitly", "Launchpad Logic"], roles: ["the co-founder and CEO"] },
  { cat: "tech", type: "online apparel brand", names: ["Swell Supply Co.", "Saltwater Thread"], roles: ["the founder"] },
  { cat: "tech", type: "managed IT services company", names: ["Beacon Managed Networks", "Keystone IT Partners"], roles: ["the owner"] },
  { cat: "tech", type: "residential solar installer", names: ["Sunward Solar", "Bright Orbit Energy"], roles: ["the owner"] },
  { cat: "retail", type: "family restaurant", names: ["Dockside Grill", "Mama Rosa's Kitchen"], roles: ["the owner"] },
  { cat: "retail", type: "clothing boutique", names: ["Coral & Co. Boutique", "Sea Glass Collective"], roles: ["the owner"] },
  { cat: "retail", type: "coffee shop", names: ["Saltbox Coffee", "Launch Pad Espresso"], roles: ["the owner"] },
  { cat: "retail", type: "sporting goods store", names: ["Offshore Surf & Skate", "Trailhead Outfitters"], roles: ["the owner"] },
];

export const ATTITUDES = [
  { id: "laidback", label: "Laid-back & chatty", how: "Relaxed and friendly, drifts into small tangents about their day. Easy to talk to but hard to pin down: they will happily talk forever without committing unless the caller guides them to a specific next step." },
  { id: "blunt", label: "Busy & blunt", how: "Has about thirty seconds. Short, clipped answers. Respects directness and gets annoyed by small talk or long explanations. Gives more time only if the first sentence earns it." },
  { id: "burned", label: "Skeptical, burned before", how: "Paid a vendor before and got nothing for it. Suspicious; asks for proof, references and what makes this different. Tests whether the caller will overpromise." },
  { id: "analytical", label: "Analytical, lots of questions", how: "Asks many specific questions: exactly how it works, what happens when something goes wrong, contract terms, cost breakdown, measurable results. Dislikes vague answers." },
  { id: "price", label: "Price-focused", how: "Keeps steering back to cost and compares to cheaper options, including doing it themselves. Needs value explained against cost before anything else." },
  { id: "loyal", label: "Happy with current vendor", how: "Already has someone for this and is loyal to them. Not unhappy, so sees no reason to change. The caller has to find a real gap without trashing the current vendor." },
  { id: "curious", label: "Curious early adopter", how: "Excited about new ideas and asks lots of questions, sometimes testing whether the caller really knows their stuff. Easily sidetracked; the caller must steer to a next step." },
  { id: "noncommittal", label: "Friendly but noncommittal", how: 'Very nice and agreeable ("that sounds interesting") but never commits, defaulting to "send me something" or "let me think about it". The caller must get a specific time on the calendar or a clear yes or no.' },
  { id: "overwhelmed", label: "Stressed & overwhelmed", how: "Short-staffed and frazzled, with no bandwidth for anything new. Responds to someone who makes it sound easy and takes work off their plate, not to someone adding homework." },
  { id: "committee", label: "Needs partner approval", how: "Cannot decide alone; a partner, spouse or corporate office has to agree, and they use that as a way out. The caller should find out who else decides and set up a time to talk to both." },
  { id: "doubter", label: "Doubts you because you're young", how: 'Notices the caller sounds young and asks whether a student can be trusted ("how old are you?", "is this a school project?"). Respects confidence, proof of past work and professionalism, not defensiveness.' },
];

const PAINS = [
  "a slow season is coming and they need more customers",
  "they spend money on ads with no idea whether it works",
  "they are short-staffed and everyone is stretched thin",
  "a new competitor opened nearby and took some of their regulars",
  "their online reviews and listing are out of date and they know it",
  "cash flow is tight this quarter, so any spending needs a fast payback",
  "they are trying to grow but every new customer means more admin work for them personally",
  "honestly no real need right now: things are fine, and the best move for the caller is to qualify out politely and leave the door open",
];
const TRIGGERS = ["simple dollar math about what the problem is costing them", "a free, no-strings first step", "hearing about a similar business the caller helped", "the caller being local", "no long contract", "a concrete picture of exactly what would happen first", "speed: results within a couple of weeks", "the caller asking good questions and actually listening"];
const DEALBREAKERS = ["being talked at for more than about thirty seconds", "a pushy or scripted tone", "jargon they do not understand", "not getting a straight answer about price", "the caller trashing their current vendor", "promises that sound too good to be true", "the caller not knowing basic facts about their own product"];
const PEOPLE = ["Rick", "Denise", "Marco", "Tony", "Jasmine", "Dave", "Karen", "Luis", "Brianna", "Earl", "Priya", "Kevin", "Tasha", "Wes", "Monique", "Hank", "Sofia", "Derek", "Lena", "Curtis", "Aaliyah", "Bobby", "Nicole", "Raj"];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

const OPENERS: Record<string, (p: Prospect) => string> = {
  trades: (p) => pick([`Yeah, this is ${p.person}.`, `${p.name}, ${p.person} speaking.`, `Hello? This is ${p.person}.`]),
  appointments: (p) => pick([`Thank you for calling ${p.name}, this is ${p.person}, how can I help you?`, `${p.name}, this is ${p.person}.`]),
  professional: (p) => pick([`${p.name}, this is ${p.person} speaking. How may I help you?`, `Good afternoon, ${p.name}, ${p.person} speaking.`]),
  tech: (p) => pick([`Hey, this is ${p.person}.`, `${p.name}, ${p.person} here.`]),
  retail: (p) => pick([`${p.name}, this is ${p.person}!`, `Hi, ${p.name}, this is ${p.person}, what can I do for you?`]),
};

export function makeProspect(cat?: string, attitudeId?: string): Prospect & { opener: string; rate: string } {
  const ind = pick(INDUSTRIES.filter((i) => !cat || i.cat === cat)), c = CATEGORIES[ind.cat];
  const att = ATTITUDES.find((a) => a.id === attitudeId) ?? pick(ATTITUDES);
  const person = pick(PEOPLE), role = pick(ind.roles);
  const p: Prospect = {
    cat: ind.cat, type: ind.type, name: pick(ind.names), person, role, who: `${person}, ${role}`,
    attitude: att.id, attitudeLabel: att.label, attitudeHow: att.how, style: c.style, moment: pick(c.moments),
    situation: pick(PAINS), trigger: pick(TRIGGERS), dealbreaker: pick(DEALBREAKERS),
  };
  return { ...p, opener: OPENERS[ind.cat](p), rate: (0.94 + Math.random() * 0.14).toFixed(2) };
}

export const JUDGES: Record<"plan" | "shark" | "selling", Judge[]> = {
  plan: [
    { name: "Ms. Carter", role: "Commercial lender, community bank", style: "Conservative and polite; thinks like a lender protecting the bank's money.", focus: "repayment, cash flow, collateral, what happens in a bad year" },
    { name: "Mr. Okafor", role: "Venture capital associate", style: "Energetic and probing; thinks in terms of growth and scale.", focus: "market size, growth beyond the first city, defensibility, the business in five years" },
    { name: "Mrs. Delgado", role: "Retired small-business owner", style: "Warm but practical; ran a business for twenty years and knows what owners care about.", focus: "how real customers will react, day-to-day operations, the founders' time and roles" },
    { name: "Mr. Patel", role: "Chief financial officer", style: "Precise and quiet; never accepts a number without the assumption behind it.", focus: "unit economics, customer acquisition cost, churn, the assumptions behind the projections" },
    { name: "Ms. Brooks", role: "Marketing executive", style: "Quick and sharp; cares about brand and how the business wins customers.", focus: "positioning, competitors, sales channels, how the first twenty customers are won" },
    { name: "Mr. Hughes", role: "SBA microloan officer", style: "Methodical; walks through the loan application in his head.", focus: "use of funds line by line, credit and co-signers (the founders are students), insurance, legal structure" },
  ],
  shark: [
    { name: "The Numbers Shark", role: "Investor who loves royalty deals", style: "Cold and blunt; calls bad numbers ridiculous.", focus: "margins, valuation math, how fast the money comes back" },
    { name: "The Mentor Shark", role: "Self-made entrepreneur", style: "Warm with tough love; invests in people more than spreadsheets.", focus: "grit, the founders' story, how they handle setbacks" },
    { name: "The Tech Shark", role: "Software investor", style: "Analytical and quick; thinks in software and scale.", focus: "whether this scales or is just a service business, recurring revenue, the moat" },
    { name: "The Main Street Shark", role: "Owner of a chain of local businesses", style: "Practical and folksy; has hired vendors like this before.", focus: "whether customers really pay, churn, operations, expanding to other cities" },
    { name: "The Closer", role: "Aggressive dealmaker", style: "Intimidating; interrupts and makes lowball offers to test confidence.", focus: "valuation, control, what the founders are willing to give up" },
  ],
  selling: [
    { name: "Dana Whitfield", role: "the buyer", style: "Busy, direct, has seen a lot of vendor pitches.", focus: "return on investment and how hard the switch will be" },
    { name: "Sam Okoro", role: "the buyer", style: "Friendly and curious but careful with money.", focus: "what it costs, what could go wrong, and who supports them afterward" },
    { name: "Pat Lindqvist", role: "the buyer", style: "Analytical; asks for specifics and examples.", focus: "proof that it works for a business like theirs" },
  ],
};

export function makeJudge(kind: keyof typeof JUDGES, idx?: number): Judge & { rate: number } {
  const list = JUDGES[kind];
  return { ...(idx != null && list[idx] ? list[idx] : pick(list)), rate: +(0.95 + Math.random() * 0.1).toFixed(2) };
}
