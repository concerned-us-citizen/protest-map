export type State = {
  fullName: string;
  abbreviation: StateAbbreviation;
  qid: string;
};

export type StateAbbreviation =
  | "AL"
  | "AK"
  | "AZ"
  | "AR"
  | "CA"
  | "CO"
  | "CT"
  | "DE"
  | "FL"
  | "GA"
  | "HI"
  | "ID"
  | "IL"
  | "IN"
  | "IA"
  | "KS"
  | "KY"
  | "LA"
  | "ME"
  | "MD"
  | "MA"
  | "MI"
  | "MN"
  | "MS"
  | "MO"
  | "MT"
  | "NE"
  | "NV"
  | "NH"
  | "NJ"
  | "NM"
  | "NY"
  | "NC"
  | "ND"
  | "OH"
  | "OK"
  | "OR"
  | "PA"
  | "RI"
  | "SC"
  | "SD"
  | "TN"
  | "TX"
  | "UT"
  | "VT"
  | "VA"
  | "WA"
  | "WV"
  | "WI"
  | "WY"
  | "PR"
  | "DC"
  | "GU"
  | "AS"
  | "VI"
  | "MP";

export const states: State[] = [
  {
    fullName: "Alabama",
    abbreviation: "AL",
    qid: "Q173",
  },
  {
    fullName: "Alaska",
    abbreviation: "AK",
    qid: "Q797",
  },
  {
    fullName: "Arizona",
    abbreviation: "AZ",
    qid: "Q816",
  },
  {
    fullName: "Arkansas",
    abbreviation: "AR",
    qid: "Q1612",
  },
  {
    fullName: "California",
    abbreviation: "CA",
    qid: "Q99",
  },
  {
    fullName: "Colorado",
    abbreviation: "CO",
    qid: "Q1261",
  },
  {
    fullName: "Connecticut",
    abbreviation: "CT",
    qid: "Q779",
  },
  {
    fullName: "Delaware",
    abbreviation: "DE",
    qid: "Q1393",
  },
  {
    fullName: "Florida",
    abbreviation: "FL",
    qid: "Q812",
  },
  {
    fullName: "Georgia",
    abbreviation: "GA",
    qid: "Q1428",
  },
  {
    fullName: "Hawaii",
    abbreviation: "HI",
    qid: "Q782",
  },
  {
    fullName: "Idaho",
    abbreviation: "ID",
    qid: "Q1221",
  },
  {
    fullName: "Illinois",
    abbreviation: "IL",
    qid: "Q1204",
  },
  {
    fullName: "Indiana",
    abbreviation: "IN",
    qid: "Q1415",
  },
  {
    fullName: "Iowa",
    abbreviation: "IA",
    qid: "Q1546",
  },
  {
    fullName: "Kansas",
    abbreviation: "KS",
    qid: "Q1558",
  },
  {
    fullName: "Kentucky",
    abbreviation: "KY",
    qid: "Q1603",
  },
  {
    fullName: "Louisiana",
    abbreviation: "LA",
    qid: "Q1588",
  },
  {
    fullName: "Maine",
    abbreviation: "ME",
    qid: "Q724",
  },
  {
    fullName: "Maryland",
    abbreviation: "MD",
    qid: "Q1391",
  },
  {
    fullName: "Massachusetts",
    abbreviation: "MA",
    qid: "Q771",
  },
  {
    fullName: "Michigan",
    abbreviation: "MI",
    qid: "Q1166",
  },
  {
    fullName: "Minnesota",
    abbreviation: "MN",
    qid: "Q1527",
  },
  {
    fullName: "Mississippi",
    abbreviation: "MS",
    qid: "Q1494",
  },
  {
    fullName: "Missouri",
    abbreviation: "MO",
    qid: "Q1581",
  },
  {
    fullName: "Montana",
    abbreviation: "MT",
    qid: "Q1212",
  },
  {
    fullName: "Nebraska",
    abbreviation: "NE",
    qid: "Q1553",
  },
  {
    fullName: "Nevada",
    abbreviation: "NV",
    qid: "Q1227",
  },
  {
    fullName: "New Hampshire",
    abbreviation: "NH",
    qid: "Q759",
  },
  {
    fullName: "New Jersey",
    abbreviation: "NJ",
    qid: "Q1408",
  },
  {
    fullName: "New Mexico",
    abbreviation: "NM",
    qid: "Q1522",
  },
  {
    fullName: "New York",
    abbreviation: "NY",
    qid: "Q1384",
  },
  {
    fullName: "North Carolina",
    abbreviation: "NC",
    qid: "Q1454",
  },
  {
    fullName: "North Dakota",
    abbreviation: "ND",
    qid: "Q1207",
  },
  {
    fullName: "Ohio",
    abbreviation: "OH",
    qid: "Q1397",
  },
  {
    fullName: "Oklahoma",
    abbreviation: "OK",
    qid: "Q1649",
  },
  {
    fullName: "Oregon",
    abbreviation: "OR",
    qid: "Q824",
  },
  {
    fullName: "Pennsylvania",
    abbreviation: "PA",
    qid: "Q1400",
  },
  {
    fullName: "Rhode Island",
    abbreviation: "RI",
    qid: "Q1387",
  },
  {
    fullName: "South Carolina",
    abbreviation: "SC",
    qid: "Q1456",
  },
  {
    fullName: "South Dakota",
    abbreviation: "SD",
    qid: "Q1211",
  },
  {
    fullName: "Tennessee",
    abbreviation: "TN",
    qid: "Q1509",
  },
  {
    fullName: "Texas",
    abbreviation: "TX",
    qid: "Q1439",
  },
  {
    fullName: "Utah",
    abbreviation: "UT",
    qid: "Q829",
  },
  {
    fullName: "Vermont",
    abbreviation: "VT",
    qid: "Q16551",
  },
  {
    fullName: "Virginia",
    abbreviation: "VA",
    qid: "Q1370",
  },
  {
    fullName: "Washington",
    abbreviation: "WA",
    qid: "Q1223",
  },
  {
    fullName: "West Virginia",
    abbreviation: "WV",
    qid: "Q1371",
  },
  {
    fullName: "Wisconsin",
    abbreviation: "WI",
    qid: "Q1537",
  },
  {
    fullName: "Wyoming",
    abbreviation: "WY",
    qid: "Q1214",
  },
  {
    fullName: "Puerto Rico",
    abbreviation: "PR",
    qid: "Q1183",
  },
  {
    fullName: "District of Columbia",
    abbreviation: "DC",
    qid: "Q3551781",
  },
  {
    fullName: "Guam",
    abbreviation: "GU",
    qid: "Q16635",
  },
  {
    fullName: "American Samoa",
    abbreviation: "AS",
    qid: "Q16641",
  },
  {
    fullName: "U.S. Virgin Islands",
    abbreviation: "VI",
    qid: "Q11703",
  },
  {
    fullName: "United States Virgin Islands",
    abbreviation: "VI",
    qid: "Q11703",
  },
  {
    fullName: "Northern Mariana Islands",
    abbreviation: "MP",
    qid: "Q16644",
  },
];

const normalizeKey = (s: string): string =>
  s.toLowerCase().replace(/[^a-z]/g, "");

const stateLookup: Map<string, State> = new Map();
for (const state of states) {
  stateLookup.set(normalizeKey(state.fullName), state);
  stateLookup.set(normalizeKey(state.abbreviation), state);
}

export function getStateInfo(stateName: string) {
  const normalized = normalizeKey(stateName);
  return stateLookup.get(normalized);
}
