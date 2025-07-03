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

const { Octokit } = require("@octokit/rest");
const fs = require('fs');
const fetch = require('node-fetch');
import { jiraServer } from './jira';

const owner = 'TogetherSchool';
const repo = 'educe-tec';
const stateDir = `./repo-state/${owner}/${repo}`;
const stateFile = `${stateDir}/alreadyCreated.txt`;
const mappingFile = `${stateDir}/mapping.txt`;

export const repoByLabel: Record<string, string> = {
    'BE': 'educe-tec',
    'FE': 'educe-fe-monorepo',
    'Fe': 'educe-fe-monorepo',
    'iOS': 'educe-ios',
    'Android': 'educe-android',
    'DevOps': 'dev-ops',
};

export class GhComment {
    public Body: string;
    public User: string;
    public PostedAt: string;
    constructor(date:string, user:string, body:string) {
        this.Body = body;
        this.User = user;
        this.PostedAt = date;
    }
}

export class GhAttachment {
    public Name: string;
    public Url: string;
    public User: string;
    public PostedAt: string;
    constructor(date:string, user:string, name:string, url:string) {
        this.Name = name;
        this.Url = url;
        this.User = user;
        this.PostedAt = date;
    }
}

export class GhIssue {
    public Title: string;
    public Labels: string[];
    public Description: string;
    public State: string;
    public Milestone: string;
    public Assignee: string;
    public JiraReferenceId: string;
    public Children: GhIssue[];
    public Assignable: boolean;
    public Comments: GhComment[];
    public Attachments: GhAttachment[];
    public Repo: string;
    constructor() {
        this.Title = '';
        this.Labels = [];
        this.Description = "";
        this.State = "open";
        this.Milestone = "";
        this.Assignee = "";
        this.JiraReferenceId = "";
        this.Children = [];
        this.Assignable = false;
        this.Comments = [];
        this.Attachments = [];
        this.Repo = repo;
    }
}

function sleep(seconds: number): Promise<null> {
    const ms = seconds * 1000;
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function addComment(issueNumber: number, issueRepo: string, client: any, body: string, retry: number = 0) {
    try {
        let resp = await client.rest.issues.createComment({
            owner: owner,
            repo: issueRepo,
            issue_number: issueNumber,
            body: body,
          });
        if (resp.status == 403) {
            const backoffSeconds= 60*(2**(retry));
            console.log(`Getting rate limited. Sleeping ${backoffSeconds} seconds`);
            await sleep(backoffSeconds);
            console.log("Trying again");
            await addComment(issueNumber, issueRepo, client, body, retry + 1);
        } else if (resp.status > 210) {
            throw new Error(`Failed to comment on issue with status code: ${resp.status}. Full response: ${resp}`);
        }
    } catch (ex) {
        console.log(`Failed to comment on issue with error: ${ex}`);
        const backoffSeconds= 60*(2**(retry));
        console.log(`Sleeping ${backoffSeconds} seconds before retrying`);
        await sleep(backoffSeconds);
        console.log("Trying again");
        await addComment(issueNumber, issueRepo, client, body, retry + 1);
    }
}

async function addMapping(issueNumber, issueRepo: string, jiraReference) {
    var bodyData = `{
    "body": "This issue has been migrated to https://github.com/${owner}/${issueRepo}/issues/${issueNumber}"
    }`;
    await fetch(`${jiraServer}/rest/api/2/issue/${jiraReference}/comment`, {
    method: 'POST',
    headers: {
        'Authorization': `Basic ${Buffer.from(
        `${process.env['JIRA_USERNAME']}:${process.env['JIRA_PASSWORD']}`
        ).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    body: bodyData
    })
}

async function createIssue(issue: GhIssue, client: any, retry: number = 0, parent: number = -1, parentRepo: string = ""): Promise<number> {

    function generateIssueReferences(issueNumbers: [number, string][], parentRepo: string) {
        return issueNumbers.map(([n,r]) => r == parentRepo ? ` #${n}` : ` ${owner}/${r}#${n}`);
    }

    let description = issue.Description;
    if (parent != -1) {
        if (parentRepo == issue.Repo) {
            description += `\nSubtask of issue #${parent}`;
        } else {
            description += `\nSubtask of issue ${owner}/${parentRepo}#${parent}`;
        }
    }
    let assignees: string[] = [];
    if (issue.Assignee && issue.Assignable) {
        assignees.push(issue.Assignee);
    }
    try {
        let resp = await client.rest.issues.create({
            owner: owner,
            repo: issue.Repo,
            assignees: assignees,
            title: issue.Title,
            body: description,
            labels: issue.Labels
        });
        if (resp.status == 403) {
            const backoffSeconds= 60*(2**(retry));
            console.log(`Getting rate limited. Sleeping ${backoffSeconds} seconds`);
            await sleep(backoffSeconds);
            console.log("Trying again");
            return await createIssue(issue, client, retry+1, parent, parentRepo);
        } else if (resp.status < 210) {
            for (const comment of issue.Comments) {
                let expandedComment = `> **@${comment.User}** *(Originally posted on ${comment.PostedAt})*\n\n${comment.Body}`;
                await addComment(resp.data.number, issue.Repo, client, expandedComment, 0);
            }
            console.log(`Issue ${owner}/${issue.Repo}#${resp.data.number} maps to ${issue.JiraReferenceId}`);
            if (!issue.Assignable && issue.Assignee) {
                await addComment(resp.data.number, issue.Repo, client, `Unable to assign user @${issue.Assignee}. If able, self-assign, otherwise tag @damccorm so that he can assign you. Because of GitHub's spam prevention system, your activity is required to enable assignment in this repo.`, 0);
            }
            fs.appendFileSync(mappingFile, `${owner}/${issue.Repo}#${resp.data.number}: ${issue.JiraReferenceId}\n`);
            try {
                await addMapping(resp.data.number, issue.Repo, issue.JiraReferenceId)
            } catch {
                try {
                    await addMapping(resp.data.number, issue.Repo, issue.JiraReferenceId)
                } catch {
                    console.log(`Failed to record migration of ${issue.JiraReferenceId} to issue ${owner}/${issue.Repo}#${resp.data.number}`);
                    fs.appendFileSync(mappingFile, `Previous line failed to be recorded in jira\n`);
                }
            }
            let issueNumbers: [number, string][] = []
            for (const child of issue.Children) {
                issueNumbers.push([await createIssue(child, client, 0, resp.data.number, issue.Repo), child.Repo]);
            }
            if (issueNumbers.length > 0) {
                await addComment(resp.data.number, issue.Repo, client,
                    `The following subtask(s) are associated with this issue:${generateIssueReferences(issueNumbers, issue.Repo).join(',')}`, 0);
            }
            return resp.data.number;
        } else {
            throw new Error(`Failed to create issue: ${resp.data.title} with status code: ${resp.status}. Full response: ${resp}`);
        }
    } catch (ex) {
        console.log(`Failed to create issue with error: ${ex}`);
        const backoffSeconds= 60*(2**(retry));
        console.log(`Sleeping ${backoffSeconds} seconds before retrying`);
        await sleep(backoffSeconds);
        console.log("Trying again");
        return await createIssue(issue, client, retry+1, parent, parentRepo);
    }
}

export async function createIssues(issues: GhIssue[], githubToken: string) {
    const client = new Octokit({auth: githubToken});
    let alreadyCreated: string[] = [];
    if (fs.existsSync(stateFile)) {
        alreadyCreated = fs.readFileSync(stateFile, {encoding:'utf8'}).split(',');
    } else {
        fs.mkdirSync(stateDir, { recursive: true });
    }
    for (const issue of issues) {
        if (alreadyCreated.indexOf(issue.JiraReferenceId) < 0) {
            await createIssue(issue, client);
            alreadyCreated.push(issue.JiraReferenceId);
            fs.writeFileSync(stateFile, alreadyCreated.join(','));
        }
    }
}
