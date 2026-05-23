export const COLORS = ['#3B82F6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0ea5e9'];

export const STATUS_COLORS = {
  done:          { bg: '#002a1a', text: '#34D399' },
  'in-progress': { bg: '#0a1f3f', text: '#60A5FA' },
  pending:       { bg: '#2a2000', text: '#FBBF24' },
};

export const SEED_VERTICALS = [
  { id: 'protocol', name: 'Protocol', lead: 'Rajesh Kumar', color: '#3B82F6', status: 'active' },
  { id: 'summits',  name: 'Summits',  lead: 'Priya Sharma', color: '#10b981', status: 'active' },
  { id: 'xpd',     name: 'XPD',      lead: 'Amit Singh',   color: '#f59e0b', status: 'active' },
  { id: 'eg_it',   name: 'EG & IT',  lead: 'Sunita Verma', color: '#8b5cf6', status: 'active' },
];

export const SEED_OFFICERS = [
  { id: 'o1', name: 'Arun Mehta',    designation: 'IFS (2015)', current_vertical: 'protocol', contact: 'arun@gov.in'   },
  { id: 'o2', name: 'Deepa Rao',     designation: 'IFS (2017)', current_vertical: 'protocol', contact: 'deepa@gov.in'  },
  { id: 'o3', name: 'Sanjay Tiwari', designation: 'SFS (2018)', current_vertical: 'summits',  contact: 'sanjay@gov.in' },
  { id: 'o4', name: 'Meena Pillai',  designation: 'SFS (2019)', current_vertical: 'summits',  contact: 'meena@gov.in'  },
  { id: 'o5', name: 'Rohit Gupta',   designation: 'JS',         current_vertical: 'xpd',      contact: 'rohit@gov.in'  },
  { id: 'o6', name: 'Anita Bose',    designation: 'DS',         current_vertical: 'eg_it',    contact: 'anita@gov.in'  },
];

export const SEED_TASKS = [
  { id: 't1',  title: 'Venue Inspection',    vertical_id: 'protocol', assigned_officer: 'o1', status: 'done',        task_order: 1, description: 'Inspect and finalise event venue',  goal: 'Protocol Readiness' },
  { id: 't2',  title: 'Delegation Briefing', vertical_id: 'protocol', assigned_officer: 'o2', status: 'in-progress', task_order: 2, description: 'Prepare briefing documents',         goal: 'Protocol Readiness' },
  { id: 't3',  title: 'Seating Plan',        vertical_id: 'protocol', assigned_officer: 'o1', status: 'pending',     task_order: 3, description: 'Finalise seating arrangements',      goal: 'Protocol Readiness' },
  { id: 't4',  title: 'Agenda Finalisation', vertical_id: 'summits',  assigned_officer: 'o3', status: 'done',        task_order: 1, description: 'Finalise event agenda',              goal: 'Summit Execution'   },
  { id: 't5',  title: 'MOU Preparation',     vertical_id: 'summits',  assigned_officer: 'o4', status: 'in-progress', task_order: 2, description: 'Draft and review MOUs',              goal: 'Summit Execution'   },
  { id: 't6',  title: 'Press Conference',    vertical_id: 'summits',  assigned_officer: 'o3', status: 'pending',     task_order: 3, description: 'Coordinate press logistics',         goal: 'Summit Execution'   },
  { id: 't7',  title: 'Expo Layout',         vertical_id: 'xpd',      assigned_officer: 'o5', status: 'in-progress', task_order: 1, description: 'Design exhibition floor plan',       goal: 'Expo Readiness'     },
  { id: 't8',  title: 'Stall Allotment',     vertical_id: 'xpd',      assigned_officer: 'o6', status: 'pending',     task_order: 2, description: 'Allot stalls to organisations',      goal: 'Expo Readiness'     },
  { id: 't9',  title: 'WG Schedule',         vertical_id: 'eg_it',    assigned_officer: 'o1', status: 'done',        task_order: 1, description: 'Schedule expert group sessions',     goal: 'EG & IT Readiness'  },
  { id: 't10', title: 'Report Compilation',  vertical_id: 'eg_it',    assigned_officer: 'o2', status: 'pending',     task_order: 2, description: 'Compile EG reports',                goal: 'EG & IT Readiness'  },
  { id: 't11', title: 'Network Setup',       vertical_id: 'eg_it',    assigned_officer: 'o5', status: 'done',        task_order: 3, description: 'Set up secure network at venue',     goal: 'EG & IT Readiness'  },
  { id: 't12', title: 'AV Systems Check',    vertical_id: 'eg_it',    assigned_officer: 'o6', status: 'in-progress', task_order: 4, description: 'Test all audio-visual systems',      goal: 'EG & IT Readiness'  },
];
