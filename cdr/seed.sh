#!/usr/bin/env bash
# Seeds the local EHRbase with the templates in ./templates and ~20 synthetic
# patients, each with a few vital-signs encounters, a problem list and
# sometimes a lab report. All data is made up and repeatable (fixed RNG seed).
#
# Safe to run again: existing templates are skipped, and so is any patient
# whose subject ID already has an EHR.
#
#   ./seed.sh                      # EHRbase at http://localhost:8081/ehrbase
#   EHRBASE_URL=http://host:8080/ehrbase PATIENTS=50 ./seed.sh
#
# Needs: bash, curl, jq, GNU date.
set -euo pipefail

EHRBASE_URL=${EHRBASE_URL:-http://localhost:8081/ehrbase}
PATIENTS=${PATIENTS:-20}
NAMESPACE=ehrbase-explorer:synthetic
API=$EHRBASE_URL/rest/openehr/v1
DIR=$(cd "$(dirname "$0")" && pwd)

VITALS='IDCR - Vital Signs Encounter.v1'
PROBLEMS='IDCR - Problem List.v1'
LAB='IDCR - Laboratory Test Report.v0'

RANDOM=4242 # deterministic data

for cmd in curl jq date; do
  command -v "$cmd" >/dev/null || { echo "seed.sh: $cmd is required" >&2; exit 1; }
done

uri() { jq -rn --arg s "$1" '$s|@uri'; }
# The random helpers set globals instead of printing: $(...) runs in a
# subshell, where drawing from RANDOM wouldn't advance the parent's sequence.
# rnd MIN MAX → R = integer in [MIN, MAX]
rnd() { R=$(($1 + RANDOM % ($2 - $1 + 1))); }
# pick ITEM... → P = one of the arguments
pick() { local a=("$@"); P=${a[RANDOM % ${#a[@]}]}; }
# iso DAYS_AGO → T = ISO timestamp at a random time of day that many days ago
NOW=$(date -u +%s)
iso() { rnd 0 43200; T=$(date -u -d "@$((NOW - $1 * 86400 - R))" +%Y-%m-%dT%H:%M:%SZ); }

# api METHOD PATH [curl args...] → body on stdout; fails with the response on HTTP >= 400
api() {
  local method=$1 path=$2 out code
  shift 2
  out=$(mktemp)
  code=$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "$API$path" "$@")
  if ((code >= 400)); then
    echo "seed.sh: $method $path → HTTP $code" >&2
    cat "$out" >&2; echo >&2
    rm -f "$out"
    return 1
  fi
  cat "$out"
  rm -f "$out"
}

echo "Waiting for EHRbase at $EHRBASE_URL ..."
for _ in $(seq 60); do
  curl -sf -o /dev/null "$EHRBASE_URL/rest/status" && break
  sleep 5
done
curl -sf -o /dev/null "$EHRBASE_URL/rest/status" || { echo "seed.sh: EHRbase not reachable" >&2; exit 1; }

# --- Templates ---------------------------------------------------------------
existing=$(api GET /definition/template/adl1.4 -H 'Accept: application/json' | jq -r '.[].template_id')
for opt in "$DIR"/templates/*.opt; do
  id=$(basename "$opt" .opt)
  if grep -qxF "$id" <<<"$existing"; then
    echo "template  $id (exists)"
  else
    api POST /definition/template/adl1.4 -H 'Content-Type: application/xml' --data-binary @"$opt" >/dev/null
    echo "template  $id (uploaded)"
  fi
done

# --- Compositions --------------------------------------------------------------
# post_flat EHR_ID TEMPLATE_ID JSON
post_flat() {
  api POST "/ehr/$1/composition?templateId=$(uri "$2")&format=FLAT" \
    -H 'Content-Type: application/json' -H 'Accept: application/json' -H 'Prefer: return=minimal' \
    --data-binary "$3" >/dev/null
}

# Common context: who/where/when.
ctx() { # START_TIME COMPOSER FACILITY PREFIX
  jq -n --arg t "$1" --arg c "$2" --arg f "$3" --arg p "$4" '{
    "ctx/language": "en", "ctx/territory": "GB",
    ($p + "/composer|name"): $c,
    ($p + "/context/start_time"): $t,
    ($p + "/context/setting|code"): "238", ($p + "/context/setting|value"): "other care",
    ($p + "/context/setting|terminology"): "openehr",
    ($p + "/context/_health_care_facility|name"): $f
  }'
}

vital_signs() { # EHR_ID TIME COMPOSER FACILITY SYS DIA HR RR TEMP SPO2
  local p=vital_signs_observations/vital_signs
  local news=0
  (($5 <= 100 || $5 >= 220)) && news=$((news + 3))
  (($7 > 110 || $7 < 45)) && news=$((news + 2))
  (($8 > 24)) && news=$((news + 3))
  ((${10} < 94)) && news=$((news + 2))
  post_flat "$1" "$VITALS" "$(ctx "$2" "$3" "$4" vital_signs_observations | jq \
    --arg p "$p" --arg t "$2" \
    --argjson sys "$5" --argjson dia "$6" --argjson hr "$7" --argjson rr "$8" \
    --argjson temp "$9" --argjson spo2 "${10}" --argjson news "$news" '. + {
      ($p + "/blood_pressure/systolic|magnitude"): $sys, ($p + "/blood_pressure/systolic|unit"): "mm[Hg]",
      ($p + "/blood_pressure/diastolic|magnitude"): $dia, ($p + "/blood_pressure/diastolic|unit"): "mm[Hg]",
      ($p + "/blood_pressure/time"): $t,
      ($p + "/pulse_heart_beat/heart_rate|magnitude"): $hr, ($p + "/pulse_heart_beat/heart_rate|unit"): "/min",
      ($p + "/pulse_heart_beat/time"): $t,
      ($p + "/respirations/rate|magnitude"): $rr, ($p + "/respirations/rate|unit"): "/min",
      ($p + "/respirations/time"): $t,
      ($p + "/body_temperature/temperature|magnitude"): $temp, ($p + "/body_temperature/temperature|unit"): "°C",
      ($p + "/body_temperature/time"): $t,
      ($p + "/indirect_oximetry/spo2|numerator"): $spo2, ($p + "/indirect_oximetry/spo2|denominator"): 100,
      ($p + "/indirect_oximetry/spo2|type"): 2,
      ($p + "/indirect_oximetry/time"): $t,
      ($p + "/avpu/avpu_observation|code"): "at0005", ($p + "/avpu/avpu_observation|value"): "Alert",
      ($p + "/avpu/avpu_observation|terminology"): "local",
      ($p + "/avpu/time"): $t,
      ($p + "/news_uk_rcp/total_score"): $news,
      ($p + "/news_uk_rcp/time"): $t
    }')"
}

problem_list() { # EHR_ID TIME COMPOSER FACILITY "name|onset|description"...
  local ehr=$1 t=$2 c=$3 f=$4 body i=0
  shift 4
  body=$(ctx "$t" "$c" "$f" problem_list)
  for prob in "$@"; do
    IFS='|' read -r name onset desc <<<"$prob"
    body=$(jq --arg p "problem_list/problems_and_issues/problem_diagnosis:$i" \
      --arg n "$name" --arg o "$onset" --arg d "$desc" --arg t "$t" '. + {
        ($p + "/problem_diagnosis_name"): $n,
        ($p + "/clinical_description"): $d,
        ($p + "/date_time_of_onset"): $o,
        ($p + "/last_updated"): $t
      }' <<<"$body")
    i=$((i + 1))
  done
  post_flat "$ehr" "$PROBLEMS" "$body"
}

lab_report() { # EHR_ID TIME COMPOSER FACILITY TEST VALUE UNIT CONCLUSION
  local p=laboratory_test_report/laboratory_test:0
  rnd 100000 999999
  post_flat "$1" "$LAB" "$(ctx "$2" "$3" "$4" laboratory_test_report | jq \
    --arg p "$p" --arg t "$2" --arg test "$5" --argjson v "$6" --arg u "$7" --arg concl "$8" \
    --arg rid "LAB-$R" '. + {
      "laboratory_test_report/context/report_id": $rid,
      ($p + "/test_name"): $test,
      ($p + "/time"): $t,
      ($p + "/test_status|code"): "at0038", ($p + "/test_status|value"): "Final",
      ($p + "/test_status|terminology"): "local",
      ($p + "/laboratory_test_panel:0/laboratory_result:0/result_value|magnitude"): $v,
      ($p + "/laboratory_test_panel:0/laboratory_result:0/result_value|unit"): $u,
      ($p + "/conclusion"): $concl
    }')"
}

# --- Patients ------------------------------------------------------------------
CLINICIANS=("Dr Amira Haddad" "Dr Lars Nilsson" "Nurse Priya Patel" "Dr Tomás Ortega" "Nurse Grace Okafor")
FACILITIES=("Riverside General Hospital" "Northgate Health Centre" "St Elm Community Clinic")
PROBLEM_POOL=(
  "Essential hypertension|Persistently raised blood pressure, on lifestyle advice."
  "Type 2 diabetes mellitus|Diet and metformin controlled."
  "Asthma|Intermittent wheeze, uses salbutamol inhaler as needed."
  "Chronic obstructive pulmonary disease|Exertional breathlessness, ex-smoker."
  "Hypothyroidism|Stable on levothyroxine."
  "Osteoarthritis of knee|Pain on walking, managed with paracetamol."
  "Atrial fibrillation|Rate controlled, anticoagulated."
  "Migraine|Episodic, without aura."
  "Hyperlipidaemia|On statin therapy."
  "Iron deficiency anaemia|Oral iron supplementation started."
)
LAB_POOL=(
  "HbA1c|mmol/mol|38|75|Glycaemic control reviewed."
  "Haemoglobin|g/L|98|165|Full blood count reviewed."
  "Creatinine|umol/L|55|140|Renal function reviewed."
  "Total cholesterol|mmol/L|3|8|Lipid profile reviewed."
)

created=0 skipped=0 compositions=0
for n in $(seq 1 "$PATIENTS"); do
  subject=$(printf 'SYN-%04d' "$n")

  # Draw this patient's numbers before any skip, so a rerun with more
  # patients gives the later ones the same data as a single run would.
  rnd 105 165; baseline_sys=$R
  rnd 58 92; baseline_hr=$R
  rnd 2 4; nvisits=$R
  rnd 1 3; nprobs=$R
  has_lab=$((RANDOM % 2))
  pick "${CLINICIANS[@]}"; clinician=$P
  pick "${FACILITIES[@]}"; facility=$P
  # Draw the whole patient up front (see above): visits, problems, lab.
  visits=()
  rnd 200 365; day=$R
  for _ in $(seq "$nvisits"); do
    rnd -12 12; sys=$((baseline_sys + R))
    rnd -5 8; dia=$((sys * 6 / 10 + R))
    rnd -8 15; hr=$((baseline_hr + R))
    rnd 12 22; rr=$R
    rnd 361 384; temp=$((R / 10)).$((R % 10))
    rnd 92 100; spo2=$R
    pick "${CLINICIANS[@]}"; who=$P
    iso "$day"
    visits+=("$T|$who|$sys|$dia|$hr|$rr|$temp|$spo2")
    rnd 20 90; day=$((day - R))
    ((day < 1)) && day=1
  done
  probs=() used=" "
  while ((${#probs[@]} < nprobs)); do
    i=$((RANDOM % ${#PROBLEM_POOL[@]}))
    [[ $used == *" $i "* ]] && continue
    used+="$i "
    IFS='|' read -r name desc <<<"${PROBLEM_POOL[$i]}"
    rnd 1 15
    probs+=("$name|$(date -u -d "$R years ago" +%Y-%m-%d)|$desc")
  done
  rnd 1 60; iso "$R"; problems_time=$T
  pick "${LAB_POOL[@]}"; IFS='|' read -r test unit lo hi concl <<<"$P"
  rnd "$lo" "$hi"; lab_value=$R
  rnd 1 120; iso "$R"; lab_time=$T

  found=$(api GET "/ehr?subject_id=$(uri "$subject")&subject_namespace=$(uri "$NAMESPACE")" \
    -H 'Accept: application/json' 2>/dev/null | jq -r '.ehr_id.value // empty' || true)
  if [[ -n $found ]]; then
    echo "patient   $subject (exists, $found)"
    skipped=$((skipped + 1))
    continue
  fi

  ehr=$(api POST /ehr -H 'Content-Type: application/json' -H 'Accept: application/json' \
    -H 'Prefer: return=representation' --data-binary "$(jq -n --arg s "$subject" --arg ns "$NAMESPACE" '{
      _type: "EHR_STATUS",
      archetype_node_id: "openEHR-EHR-EHR_STATUS.generic.v1",
      name: { _type: "DV_TEXT", value: "EHR Status" },
      subject: { _type: "PARTY_SELF", external_ref: {
        id: { _type: "GENERIC_ID", value: $s, scheme: "synthetic" },
        namespace: $ns, type: "PERSON" } },
      is_modifiable: true, is_queryable: true
    }')" | jq -r '.ehr_id.value')

  # Vital signs (oldest first, over the past year), a problem list, maybe a lab report.
  for v in "${visits[@]}"; do
    IFS='|' read -r t who sys dia hr rr temp spo2 <<<"$v"
    vital_signs "$ehr" "$t" "$who" "$facility" "$sys" "$dia" "$hr" "$rr" "$temp" "$spo2"
    compositions=$((compositions + 1))
  done
  problem_list "$ehr" "$problems_time" "$clinician" "$facility" "${probs[@]}"
  compositions=$((compositions + 1))
  if ((has_lab)); then
    lab_report "$ehr" "$lab_time" "$clinician" "$facility" "$test" "$lab_value" "$unit" "$concl"
    compositions=$((compositions + 1))
  fi

  echo "patient   $subject → $ehr"
  created=$((created + 1))
done

echo
echo "Done: $created patients created ($compositions compositions), $skipped already present."

# --- Revisions -----------------------------------------------------------------
# Some problem lists get later versions, so there is version history to browse.
# Each one is brought up to a target version, so reruns don't add more.
REVISIONS=("SYN-0001|3" "SYN-0002|2" "SYN-0003|3" "SYN-0004|2")

aql() { # QUERY PARAMS_JSON → rows as JSON
  api POST /query/aql -H 'Content-Type: application/json' -H 'Accept: application/json' \
    --data-binary "$(jq -n --arg q "$1" --argjson p "$2" '{q: $q, query_parameters: $p}')" | jq -c '.rows'
}

# put_flat EHR_ID TEMPLATE_ID VERSION_UID JSON → new version of that composition
put_flat() {
  api PUT "/ehr/$1/composition/${3%%::*}?templateId=$(uri "$2")&format=FLAT" \
    -H 'Content-Type: application/json' -H 'Accept: application/json' -H 'Prefer: return=minimal' \
    -H "If-Match: $3" --data-binary "$4" >/dev/null
}

# revise_problem_list FLAT VERSION → the FLAT content of the next version.
# Version 2 updates the first problem's description; version 3 adds a problem.
revise_problem_list() {
  local p=problem_list/problems_and_issues/problem_diagnosis now
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  jq --arg p "$p" --arg now "$now" --argjson to "$(($2 + 1))" '
    with_entries(select(.key | endswith("/_uid") | not))
    | (if $to == 2 then
        .[$p + ":0/clinical_description"] += " Reviewed at follow-up; plan unchanged."
      else
        ([keys[] | capture("problem_diagnosis:(?<i>[0-9]+)/") | .i | tonumber] | max + 1) as $i
        | .[$p + ":\($i)/problem_diagnosis_name"] = "Vitamin D deficiency"
        | .[$p + ":\($i)/clinical_description"] = "Low level on screening; supplement started."
        | .[$p + ":\($i)/date_time_of_onset"] = ($now | .[0:10])
        | .[$p + ":\($i)/last_updated"] = $now
      end)
    | .[$p + ":0/last_updated"] = $now' <<<"$1"
}

revised=0
for r in "${REVISIONS[@]}"; do
  IFS='|' read -r subject target <<<"$r"
  ehr=$(api GET "/ehr?subject_id=$(uri "$subject")&subject_namespace=$(uri "$NAMESPACE")" \
    -H 'Accept: application/json' 2>/dev/null | jq -r '.ehr_id.value // empty' || true)
  [[ -z $ehr ]] && continue
  uid=$(aql "SELECT c/uid/value FROM EHR e[ehr_id/value=\$ehr] CONTAINS COMPOSITION c
WHERE c/archetype_details/template_id/value = \$template" \
    "$(jq -n --arg e "$ehr" --arg t "$PROBLEMS" '{ehr: $e, template: $t}')" | jq -r '.[0][0] // empty')
  [[ -z $uid ]] && continue
  while ((${uid##*::} < target)); do
    flat=$(api GET "/ehr/$ehr/composition/$uid?format=FLAT" -H 'Accept: application/json')
    put_flat "$ehr" "$PROBLEMS" "$uid" "$(revise_problem_list "$flat" "${uid##*::}")"
    uid="${uid%::*}::$((${uid##*::} + 1))"
    echo "revision  $subject problem list → version ${uid##*::}"
    revised=$((revised + 1))
  done
done
echo "Revisions: $revised new composition versions."
