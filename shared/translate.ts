/*
 * Copyright 2022 Google LLC
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     https://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { GhIssue, GhComment, GhAttachment, repoByLabel } from "./github";
import { jiraServer } from "./jira";

/**
 * The translation converts Jira's labels, components, and Fix-version into GitHub labels.
 * Issue-type, Priority, and Status are also converted into labels.
 */
// Label candidates to be excluded by the exact match
const labelExclusionList = [
    "Jun21", "Apr21", "May21", "Jul21", "TimeLogging", "05JulyRelease", "25SeptemberRelease",
    // BEAM labels
    "apache", "apache-beam", "beam", "beam-playground-sprint-6",
    "bigdata", "c4", "calcite", "clarified", "classcastexception",
    "cloud", "couchbase", "datastore", "doc-cleanup", "done", "eos",
    "error_message_improvement", "file-component", "findbugs",
    "flinkrunner", "full-time", "gcs_task_handler", "gcs", "go",
    "golang", "google-cloud-spanner", "grouping", "interrupts",
    "io", "java", "javadoc", "kinesis", "kubernetes", "log4j",
    "log-aggregation", "maven", "metrics", "mongodb", "mqtt", "mysql",
    "node.js", "nullability", "offset", "oom", "options", "oracle",
    "outreachy19dec", "part-time", "patch", "py-interrupts", "python",
    "python3", "python-conversion", "python-sqltransform", "redis",
    "requirements", "restful", "runner", "savepoints", "schema", "schema-io",
    "sdk-consistency", "sdk-feature-parity", "security", "serialization",
    "session", "sideinput", "slf4j", "snowflake", "spring-boot", "sslexception",
    "state", "t5", "tensorflow", "tensorflow-datasets", "tfs+beam", "thrift",
    "triggers", "update", "watermark", "windowing"
];
// Label candidates to be excluded if they contain one of these substrings
const labelContentExclusionList = [
    "Educe Support",
];
// Accepted label candidates can be mapped to a replacement value using this table.
const labelMapping: Record<string, string> = {
    'triage needed': 'awaiting triage',
    "backwards-incompatible": "backward-incompatible",
    "aws-sdk-v1": "aws",
    "aws-sdk-v2": "aws",
    "sqs": "aws",
    "benchmarking-py": "benchmark",
    "build": "build-system",
    "cdap-io-sprint-1": "cdap-io",
    "cdap-io-sprint-2": "cdap-io",
    "cdap-io-sprint-3": "cdap-io",
    "cdap-io-sprint-4": "cdap-io",
    "dataflow-runner-v2": "dataflow",
    "google-cloud-dataflow": "dataflow",
    "google-dataflow": "dataflow",
    "document": "documentation",
    "documentaion": "documentation",
    "feature-request": "new feature",
    "features": "new feature",
    "flake": "flaky",
    "flaky-test": "flaky",
    "flakey": "flaky",
    "currently-failing": "flaky",
    "gcp-quota": "gcp",
    "gsoc2017": "gsoc",
    "gsoc2018": "gsoc",
    "gsoc2019": "gsoc",
    "gsoc2020": "gsoc",
    "gsoc2021": "gsoc",
    "gsoc2022": "gsoc",
    "gsod2019": "gsod",
    "gsod2022": "gsod",
    "infra": "infrastructure",
    "jdbc_connector": "jdbcio",
    "kafkaio": "kafka",
    "easy": "good first issue",
    "easyfix": "good first issue",
    "beginner": "good first issue",
    "newbie": "good first issue",
    "starter": "good first issue",
    "starer": "good first issue",
    "pubsubio": "pubsub",
    "pubsubliteio": "pubsub",
    "sql-engine": "sql",
    "stale-assigned": "stale",
    "test-fail": "test-failures",
    "test-failure": "test-failures",
    "test-framework": "testing",
    "test-patch": "testing",
    "test-stability": "testing",
    "test": "testing",
    "testlabel": "testing",
    "tests": "testing",
    "website-revamp-2020": "website"
};

/**
 * The mapping of Jira usernames into GitHub usernames.
 */
const assigneeToHandleMapping: Record<string, string> = {
    "Matt": "matt-bushell",
    "jose": "jalberto-tgs",
    /*
        // BEAM Project users
        "heejong": "ihji",
        "reuvenlax": "reuvenlax",
        "chamikara": "chamikaramj",
        "lostluck": "lostluck",
        "kileys": "kileys",
        "egalpin": "egalpin",
        "dpcollins-google": "dpcollins-google ",
        "johnjcasey": "johnjcasey",
        "emilymye": "emilymye",
        "mosche": "mosche",
        "danoliveira": "youngoli",
        "bhulette": "theneuralbit",
        "arunpandianp": "arunpandianp",
        "deepix": "deepix",
        "Krasavinigor": "Krasavinigor",
        "pabloem": "pabloem",
        "damccorm": "damccorm",
        "msbukal": "msbukal",
        "fbeevikm": "fbeevikm",
        "yeandy": "yeandy",
        "jbonofre": "jbonofre",
        "damondouglas": "damondouglas",
        "jrmccluskey": "jrmccluskey",
        "pcoet": "pcoet",
        "sfc-gh-kbregula": "sfc-gh-kbregula",
        "dmitryor": "dmitryor",
        "nielm": "nielm",
        "suztomo": "suztomo",
        "kerrydc": "kerrydc",
        "ibzib": "ibzib",
        "SteveNiemitz": "SteveNiemitz",
        "riteshghorse": "riteshghorse",
        "robertwb": "robertwb",
        "apilloud": "apilloud",
        "denisecase": "denisecase",
        "andreykus": "andreykus",
        "lcwik": "lukecwik",
        "aromanenko": "aromanenko-dev",
        "tvalentyn": "tvalentyn",
        "clandry94": "clandry94",
        "andreigurau": "andreigurau",
        "laraschmidt": "laraschmidt",
        "pawel.pasterz": "pawelpasterz",
        "yoshiki.obata": "lazylynx",
        "thiscensustaker": "fernando-wizeline",
        "danimartin": "dannymartinm",
        "cguillaume": "guillaumecle",
        "Mike Hernandez": "roger-mike",
        "masahito": "masahitojp",
        "yardeni": "TamirYardeni",
        "bulat.safiullin": "bullet03",
        "rarokni@gmail.com": "rezarokni",
        "EliasSegundo": "elink21",
        "andoni.guzman": "andoni-guzman",
        "ningk": "KevinGG",
        "R3tto": "Amar3tto",
        "svetak": "svetakvsundhar",
        "yihu": "Abacn",
        "duliu": "liu-du",
        "Ryan.Thompson": "ryanthompson591",
        "Anand Inguva": "AnandInguva",
        "Alexander Zhuravlev": "miamihotline",
        "janl": "je-ik",
        "Ekaterina Tatanova": "ktttnv",
        "dchen": "dxichen",
        "thiagotnunes": "thiagotnunes",
        "ahmedabu": "ahmedabu98",
        "bingyeli": "libingye816",
        "marroble": "MarcoRob",
        "elizaveta.lomteva": "Lizzfox"
    */
};

// From the mapping above which users can be assigned to issues
const assignable = [
    "matt-bushell", "jalberto-tgs",
    /*
            // BEAM users
            "ihji", "reuvenlax", "chamikara", "lostluck", "kileys", "egalpin",
            "emilymye", "mosche", "danoliveira", "bhulette", "pabloem", "damccorm",
            "jbonofre", "damondouglas", "suztomo", "ibzib", "robertwb", "apilloud",
            "lukecwik", "aromanenko-dev", "tvalentyn", "guillaumecle", "rezarokni",
            "KevinGG", "je-ik"
    */
];

const maxIssueDescriptionLength = 65000;
const allLabels: Set<string> = new Set();
const repoByLabelKeys = [...Object.keys(repoByLabel)].sort();

function parseQuote(d: string): string {
    let startIndex = d.indexOf("{quote}");
    if (startIndex <= -1) {
        return d;
    }
    d = d.substring(0, startIndex) + "> " + d.substring(startIndex + "{quote}".length);
    let endIndex = d.indexOf("{quote}");
    if (endIndex > -1) {
        d = d.substring(0, endIndex) + d.substring(endIndex + "{quote}".length);
    } else {
        endIndex = d.length + 100;
    }
    let index = d.indexOf("\n", startIndex);
    while (index < endIndex && index > -1) {
        d = d.substring(0, index) + "\n> " + d.substring(index + "\n> ".length);
        index = d.indexOf("\n", index+"\n> ".length);
    }

    return parseQuote(d);
}

function escapeSpecialChars(d: string): string {
    d = d.replace(/==/g, "\\==");
    d = d.replace(/--/g, "\\--");
    return parseQuote(d.replace(/>/g, "\\>"));
}

function parseLists(d: string): string {
    let curIndex = 0;
    while (curIndex > -1) {
        while (curIndex < d.length && d[curIndex] == " " || d[curIndex] == "\n") {
            curIndex++;
        }
        if (curIndex < d.length-1 && d[curIndex] == "#" && d[curIndex+1] == " ") {
            return `${escapeSpecialChars(d.slice(0, curIndex))}- ${parseLists(d.slice(curIndex+2))}`;
        }
        curIndex = d.indexOf("\n", curIndex);
    }

    return escapeSpecialChars(d);
}

function parseBold(d: string): string {
    const start = d.indexOf("{*}");
    const endOfLine = d.indexOf("\n", start);
    const endOfBlock = d.indexOf("{*}", start);
    if (start > -1 && (endOfBlock < endOfLine || endOfLine < 0) && endOfBlock > -1) {
        return `${parseLists(d.slice(0, start))}_${d.slice(start+1, endOfBlock)}_${parseBold(d.slice(endOfBlock+3))}`
    }

    return parseLists(d);
}

function parseItalics(d: string): string {
    const start = d.indexOf("{_}");
    const endOfLine = d.indexOf("\n", start);
    const endOfBlock = d.indexOf("{_}", start);
    if (start > -1 && (endOfBlock < endOfLine || endOfLine < 0) && endOfBlock > -1) {
        return `${parseBold(d.slice(0, start))}_${d.slice(start+1, endOfBlock)}_${parseUnderline(d.slice(endOfBlock+3))}`
    }

    return parseBold(d);
}

// Markdown doesn't have underline, so we'll just go with bold
function parseUnderline(d: string): string {
    const start = d.indexOf("+");
    const endOfLine = d.indexOf("\n", start);
    const endOfBlock = d.indexOf("+", start);
    if (start > -1 && (endOfBlock < endOfLine || endOfLine < 0) && endOfBlock > -1) {
        return `${parseItalics(d.slice(0, start))}**${d.slice(start+1, endOfBlock)}**${parseUnderline(d.slice(endOfBlock+1))}`
    }

    return parseItalics(d);
}

function fixLinks(d: string): string {
    const start = d.indexOf("[");
    const endOfLine = d.indexOf("\n", start);
    const endOfLink = d.indexOf("]", start);
    const delimiter = d.indexOf("|", start);
    
    if (start > -1 && endOfLink > start) {
        if (endOfLink > endOfLine && endOfLine > -1) {
            // Potential link spans multiple lines, move on to looking in next line.
            return `${parseUnderline(d.slice(0, endOfLine + 1))}${fixLinks(d.slice(endOfLine+1))}`;
        }
        let link = d.slice(start+1, endOfLink);
        let caption = link;
        if (delimiter > -1 && delimiter < endOfLink) {
            caption = d.slice(start+1, delimiter);
            link = d.slice(delimiter+1, endOfLink);
        }
        if (link.indexOf("://") > -1) {
            return `${parseUnderline(d.slice(0, start))}[${caption}](${link})${fixLinks(d.slice(endOfLink+1))}`;
        }

        // No valid link, continue looking in rest of description.
        return `${parseUnderline(d.slice(0, endOfLink + 1))}${fixLinks(d.slice(endOfLink+1))}`;
    }

    return parseUnderline(d);
}

function parseHeaders(d: string): string {
    const headerToMarkdown = {
        "h1.": "#",
        "h2.": "##",
        "h3.": "###",
        "h4.": "####",
        "h5.": "#####"
    }
    for (const header of Object.keys(headerToMarkdown)) {
        if (d.indexOf(header) == 0) {
            d = headerToMarkdown[header] + d.slice(header.length);
        }
        while (d.indexOf(`\n${header}`) > -1) {
            d = d.replace(`\n${header}`, `\n${headerToMarkdown[header]}`)
        }
    }
    return fixLinks(d)
}

function parseCodeLines(d: string): string {
    const start = d.indexOf("{{");
    const endOfLine = d.indexOf("\n", start);
    const endOfBlock = d.indexOf("}}", start);
    if (start > -1 && (endOfBlock < endOfLine || endOfLine < 0) && endOfBlock > -1) {
        return `${parseHeaders(d.slice(0, start))}\`${d.slice(start+2, endOfBlock)}\`${parseCodeLines(d.slice(endOfBlock+2))}`
    }

    return parseHeaders(d);
}

function parseNoFormatBlocks(d: string): string {
    const start = d.indexOf("{noformat}");
    const nextOccurence = d.indexOf("{noformat}", start + 10);
    if (start > -1 && nextOccurence > -1) {
        let codeBlock = d.slice(start + "{noformat}".length, nextOccurence);
        // Jira wraps single line code blocks, GH doesn't - this adds some (dumb) formatting
        let curIndex = 100;
        while (codeBlock.indexOf(" ", curIndex) > -1) {
            curIndex = codeBlock.indexOf(" ", curIndex);
            codeBlock = codeBlock.slice(0, curIndex) + "\n" + codeBlock.slice(curIndex+1);
            curIndex += 100;
        }
        return `${parseCodeLines(d.slice(0, start))}\`\`\`\n${codeBlock}\n\`\`\`\n${parseCodeBlocks(d.slice(nextOccurence + "{noformat}".length))}`
    }

    return parseCodeLines(d);
}

function parseCodeBlocks(d: string): string {
    const start = d.indexOf("{code");
    const end = d.indexOf("}", start);
    const nextOccurence = d.indexOf("{code}", end);
    if (start > -1 && end > -1 && nextOccurence > -1) {
        let codeBlock = d.slice(end+1, nextOccurence);
        // Jira wraps single line code blocks, GH doesn't - this adds some (dumb) formatting
        let curIndex = 100;
        while (codeBlock.indexOf(" ", curIndex) > -1) {
            curIndex = codeBlock.indexOf(" ", curIndex);
            codeBlock = codeBlock.slice(0, curIndex) + "\n" + codeBlock.slice(curIndex+1);
            curIndex += 100;
        }
        return `${parseNoFormatBlocks(d.slice(0, start))}\`\`\`\n${codeBlock}\n\`\`\`\n${parseCodeBlocks(d.slice(nextOccurence + "{code}".length))}`
    }

    return parseNoFormatBlocks(d);
}

function truncate(d: string): string {
    if (d.length <= maxIssueDescriptionLength) {
        return d;
    }
    return `${d.slice(0, maxIssueDescriptionLength)}\n\n issue truncated because of its length - to see full context, see original Jira`;
}

function formatDescription(d: string): string {
    d = parseCodeBlocks(d);
    d = truncate(d);
    
    return d;
}

function validData(l): boolean {
    return !(!l || l.length <= 0);
}

function validLabel(l): boolean {

    if (!l || l.length <= 0) {
        return false;
    }
    if (l.indexOf(',') > -1) {
        return false;
    }

    if (labelExclusionList.indexOf(l) > -1) {
        return false;
    }

    if (labelContentExclusionList.some(e => l.indexOf(e) > -1)) {
        return false;
    }

    // console.log('Found valid label ' + l)

    return true;
}

function getLabel(l: string): string {
    const label = labelMapping[l] || l;
    console.log(`Assigning value: '${l}' as label: '${label}'`);
    if (label.length == 0) throw new Error(`Invalid label: '${l}'`);
    allLabels.add(label);
    return label;
}

function jiraToGhIssue(jira: any): GhIssue {
    let issue = new GhIssue();
    let issueLabels = new Set<string>();
    issue.Title = jira['Summary'];

    issueLabels.add(jira['Issue Type'].toLowerCase());
    issueLabels.add(jira['Priority'].toUpperCase());
    for (let i = 0; i < 10; i++) {
        if (validLabel(jira[`Component${i}`])) {
            issueLabels.add(getLabel(jira[`Component${i}`].toLowerCase()));
        }
        if (validLabel(jira[`Label${i}`])) {
            issueLabels.add(getLabel(jira[`Label${i}`]));
        }
        if (validLabel(jira[`Fix Version${i}`])) {
            issueLabels.add(getLabel(jira[`Fix Version${i}`]));
        }
    }
    if (validLabel(jira['Status'])) {
        issueLabels.add(getLabel(jira['Status'].toLowerCase()));
    }
    issue.Labels = Array.from(issueLabels);

    // Change the repo based on the labels.
    for (const repoKey of repoByLabelKeys) {
        if (issueLabels.has(repoKey)) {
            issue.Repo = repoByLabel[repoKey];
            console.log(`For ${repoKey} assigning repo: ${repoByLabel[repoKey]}`);
            break;
        }
    }

    issue.Description = formatDescription(jira['Description']);
    issue.Description += `\n\nImported from Jira [${jira['Issue key']}](${jiraServer}/browse/${jira['Issue key']}). Original Jira may contain additional context.`;
    if (jira['Reporter']) {
        issue.Description += `\nReported by: ${jira['Reporter']}.`;
    }
    if (jira['Inward issue link (Cloners)']) {
        issue.Description += "\nThis issue has child subcomponents which were not migrated over. See the original Jira for more information.";
    }

    for (let i = 0; i < 10; i++) {
        if (validData(jira[`Comment${i}`])) {
            let parts = limitedSplit(jira[`Comment${i}`], ";", 3);
            issue.Comments.push(new GhComment(parts[0], parts[1], formatDescription(parts[2])));
        }
        if (validData(jira[`Attachment${i}`])) {
            let parts = limitedSplit(jira[`Attachment${i}`], ";", 4);
            issue.Attachments.push(new GhAttachment(parts[0], parts[1], parts[2], parts[3]));
        }
    }

    if (issue.Attachments.length > 0) {
        issue.Description += `\n\nAttached ${issue.Attachments.length} file(s) where not copied over:\n`;
        for (let i = 0; i < issue.Attachments.length; i++) {
            let att = issue.Attachments[i];
            issue.Description += `- [${att.Name}](${att.Url}) *(By **@${att.User}** on ${att.PostedAt})*\n`;
        }
    }

    issue.Assignee = mapAssigneeToHandle(jira['Assignee']);
    issue.JiraReferenceId = jira['Issue id']

    issue.Assignable = isAssignable(issue.Assignee, mapAssigneeToHandle(jira['Assignee']));

    return issue;
}

export function jirasToGitHubIssues(jiras: any[]): GhIssue[] {
    const filteredJiras = jiras.filter(j => j["Issue Type"] != "Sub-task").filter(j => j['Summary'].indexOf("Beam Dependency Update Request:") < 0);
    const subTasks = jiras.filter(j => j["Issue Type"] == "Sub-task");
    let issues: GhIssue[] = [];
    for (const jira of filteredJiras) {
        let issue = jiraToGhIssue(jira);
        issue.Children = subTasks.filter(t => t['Parent id'] == jira['Issue id']).map(t => jiraToGhIssue(t));
        issues.push(issue);
    }

    console.log(`All the labels in use: ${JSON.stringify(Array.from(allLabels).sort(), null, 2)}`);
    return issues
}

function mapAssigneeToHandle(assignee: string): string {
    return assigneeToHandleMapping[assignee] || "";
}

function isAssignable(assignee: string, jiraUsername: string): boolean {
    // Check gh handle and jira username in case I copied the wrong one
    return (assignable.indexOf(assignee) > -1 || assignable.indexOf(jiraUsername) > -1);
}

function limitedSplit(str: string, delimiter: string, limit: number): string[] {
    const parts = str.split(delimiter);
    if (parts.length <= limit) return parts; // No need to split further
    return [...parts.slice(0, limit - 1), parts.slice(limit - 1).join(delimiter)];
}
