// Edit this file to change the Agenda checklist and Notes form.
// Keep `name` values stable once the app is in use: they are the keys used in saved drafts.
export const formConfig = {
  agenda: {
    eyebrow: "Agenda",
    heading: "Talking points",
    items: [
      {
        name: "agendaConnection",
        heading: "Reconnect and acknowledge recent wins",
        description: "How things are going, successes, leadership or staffing changes.",
      },
      {
        name: "agendaPriorities",
        heading: "Current priorities and challenges",
        description: "What is working, what is difficult, and where HNC can support.",
      },
      {
        name: "agendaPrograms",
        heading: "Program engagement and feedback",
        description: "Use of HNC supports, reasons for non-engagement, communications reach.",
      },
      {
        name: "agendaEpca",
        heading: "EPCA grant opportunities",
        description: "Local solutions, thin markets, capacity building, co-design, sustainability.",
      },
      {
        name: "agendaNurseCapacity",
        heading: "Nurse capacity education modules",
        description: "DRTT, advance care planning, palliative care, My Health Record.",
      },
      {
        name: "agendaTelehealth",
        heading: "Telehealth and Visionflex status",
        description: "Training links, resources, ACOS rollout readiness, support needs.",
      },
      {
        name: "agendaDrtt",
        heading: "DRTT and after-hours planning",
        description: "Functionality, flow, advance care plans, directives, escalation pathways.",
      },
    ],
    notes: {
      name: "agendaNotes",
      label: "Agenda notes",
      rows: 5,
    },
  },
  notes: {
    eyebrow: "Digital form",
    heading: "Visit notes",
    fields: [
      { name: "successes", label: "Successes or initiatives to acknowledge" },
      { name: "staffChanges", label: "Staff or leadership changes" },
      { name: "currentPriorities", label: "Current priorities" },
      { name: "workingWell", label: "What is working well?" },
      { name: "challenges", label: "Challenges" },
      { name: "supportNeeded", label: "Support requested from HNC" },
      { name: "trainingNeeds", label: "Training and education needs" },
      { name: "programUsage", label: "Current use of HNC programs or supports" },
      { name: "nonEngagementReasons", label: "If not engaging, what are the reasons?" },
      { name: "crossSectorSuggestions", label: "Cross-sector meeting suggestions" },
      { name: "communications", label: "Communications reach" },
      { name: "drttFeedback", label: "DRTT functionality feedback" },
      { name: "afterHoursPlan", label: "After-hours plan / advance care planning notes" },
      { name: "acosRollout", label: "MNC ACOS rollout notes" },
    ],
  },
};
