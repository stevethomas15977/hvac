import { BidOpportunity } from './proposals-page.models';

export const MOCK_OPPORTUNITIES: BidOpportunity[] = [
  {
    id: 'opp-hou-2401',
    projectName: 'River Bend Medical Office - Phase II',
    projectType: 'Healthcare',
    location: 'Houston, TX',
    source: 'Private Invite',
    dueDate: '2026-06-03T17:00:00Z',
    manufacturer: 'Marley',
    estimatedValueUsd: 385000,
    intakeStatus: 'ready',
    score: 92,
    approvedManufacturers: ['Marley', 'BAC', 'Evapco'],
    docs: [
      {
        id: 'doc-001',
        name: 'M-Sheets_RiverBend_M1-M12.pdf',
        kind: 'drawings',
        pages: 68,
        uploadedBy: 'Alex Rios',
        uploadedAt: '2026-05-28T13:15:00Z'
      },
      {
        id: 'doc-002',
        name: 'Project_Manual_Div23.pdf',
        kind: 'specs',
        pages: 122,
        uploadedBy: 'Alex Rios',
        uploadedAt: '2026-05-28T13:17:00Z'
      },
      {
        id: 'doc-003',
        name: 'Addendum_02.pdf',
        kind: 'addenda',
        pages: 14,
        uploadedBy: 'Alex Rios',
        uploadedAt: '2026-05-28T13:19:00Z'
      },
      {
        id: 'doc-004',
        name: 'Equipment_Schedule_HVAC.pdf',
        kind: 'schedule',
        pages: 9,
        uploadedBy: 'Alex Rios',
        uploadedAt: '2026-05-28T13:20:00Z'
      }
    ],
    missingItems: [],
    qualificationStatus: 'idle',
    qualificationResult: {
      confidenceScore: 0.91,
      recommendation: 'go',
      summary: 'Strong fit for cooling tower package scope with complete bid artifacts.',
      approvedManufacturers: ['Marley', 'BAC', 'Evapco'],
      scopeCandidates: [
        {
          equipmentType: 'Cooling Tower',
          confidence: 0.96,
          notes: 'Two-cell induced draft tower requirement found in M-Sheets and Div 23 specs.',
          citations: ['M-Sheets_RiverBend_M1-M12.pdf p.14', 'Project_Manual_Div23.pdf p.38']
        },
        {
          equipmentType: 'Condenser Water Controls',
          confidence: 0.86,
          notes: 'Control sequence references basin heater and VFD compatibility.',
          citations: ['Project_Manual_Div23.pdf p.41']
        }
      ],
      reasons: [
        'Private invite with existing relationship context',
        'All required intake files are present',
        'Approved manufacturer list includes in-territory product lines'
      ]
    },
    selectionStatus: 'idle',
    selectionResult: {
      toolPathModel: 'Marley NC-8414 + VFD kit',
      toolPathSummary: 'Model meets design load and condenser water temperature envelope for Houston climate profile.',
      comparisonChecks: [
        {
          field: 'Cooling Capacity',
          toolPathValue: '1,250 tons',
          manufacturerValue: 'Pending',
          severity: 'low'
        },
        {
          field: 'Approach Temperature',
          toolPathValue: '7.0 F',
          manufacturerValue: 'Pending',
          severity: 'medium'
        }
      ],
      recommendation: 'review'
    },
    events: [
      {
        id: 'evt-101',
        timestamp: '2026-05-28T13:14:00Z',
        message: 'Opportunity created from private invite email.',
        severity: 'info'
      },
      {
        id: 'evt-102',
        timestamp: '2026-05-28T13:21:00Z',
        message: 'Bid package parsed. 4 relevant documents indexed.',
        severity: 'info'
      },
      {
        id: 'evt-103',
        timestamp: '2026-05-28T13:23:00Z',
        message: 'No missing intake items. Ready to run qualification.',
        severity: 'info'
      }
    ]
  },
  {
    id: 'opp-aus-1178',
    projectName: 'Redstone Data Hall Expansion',
    projectType: 'Data Center',
    location: 'Austin, TX',
    source: 'Open Bid',
    dueDate: '2026-06-07T22:00:00Z',
    manufacturer: 'BAC',
    estimatedValueUsd: 520000,
    intakeStatus: 'processing',
    score: 78,
    approvedManufacturers: ['BAC', 'Marley'],
    docs: [
      {
        id: 'doc-010',
        name: 'HVAC_Drawings_RevC.pdf',
        kind: 'drawings',
        pages: 81,
        uploadedBy: 'Megan Ford',
        uploadedAt: '2026-05-28T12:50:00Z'
      },
      {
        id: 'doc-011',
        name: 'DataHall_Spec_Book.pdf',
        kind: 'specs',
        pages: 147,
        uploadedBy: 'Megan Ford',
        uploadedAt: '2026-05-28T12:52:00Z'
      }
    ],
    missingItems: ['Latest addendum not found', 'Mechanical schedule cross-reference is incomplete'],
    qualificationStatus: 'needs_review',
    qualificationResult: {
      confidenceScore: 0.72,
      recommendation: 'no_go',
      summary: 'Potential fit, but missing addendum introduces compliance risk for proposal commitment.',
      approvedManufacturers: ['BAC', 'Marley'],
      scopeCandidates: [
        {
          equipmentType: 'Cooling Tower',
          confidence: 0.82,
          notes: 'Scope detected, but addendum references unresolved alternates.',
          citations: ['HVAC_Drawings_RevC.pdf p.22']
        }
      ],
      reasons: [
        'Missing addendum package',
        'Incomplete schedule-to-spec cross-reference',
        'Data center delivery window is high risk'
      ]
    },
    selectionStatus: 'idle',
    events: [
      {
        id: 'evt-201',
        timestamp: '2026-05-28T12:49:00Z',
        message: 'Bid package upload completed.',
        severity: 'info'
      },
      {
        id: 'evt-202',
        timestamp: '2026-05-28T12:55:00Z',
        message: 'Parser detected possible missing addendum set.',
        severity: 'warning'
      }
    ]
  },
  {
    id: 'opp-dal-9912',
    projectName: 'Northgate K-12 Campus Retrofit',
    projectType: 'Education',
    location: 'Dallas, TX',
    source: 'Open Bid',
    dueDate: '2026-06-11T20:00:00Z',
    manufacturer: 'Evapco',
    estimatedValueUsd: 245000,
    intakeStatus: 'not_started',
    score: 64,
    approvedManufacturers: ['Evapco', 'Marley'],
    docs: [],
    missingItems: ['Bid package not uploaded'],
    qualificationStatus: 'idle',
    selectionStatus: 'idle',
    events: [
      {
        id: 'evt-301',
        timestamp: '2026-05-28T10:20:00Z',
        message: 'Opportunity imported from bid board feed.',
        severity: 'info'
      }
    ]
  }
];
