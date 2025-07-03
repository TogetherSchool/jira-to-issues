# jira-to-issues

Repo for migrating Jiras to GitHub issues. 
This is generalized version, based on the one specialized to use by the Apache Beam repo.
It allows migrating the Jiras into multiple GitHub repos, based on the labels associated with each issue.
It is abled to cross-reference between diferent repos when Jira sub-tasks have different labels.

To use the tool:

1. Clone this repo: `git clone https://github.com/TogetherSchool/jira-to-issues && cd jira-to-issues`
2. Update the target **owner/repo** in [shared/github.ts](https://github.com/TogetherSchool/jira-to-issues/blob/8a1c867eda5920acf9401eebc266afa06c5e7864/shared/github.ts) to point to your organization/repo where you want the issues created by default.
3. Update **repoByLabel** with the labels that should cause the repo to change (or define as empty {}).
4. Update the **jiraServer/jiraProject** [shared/jira.ts](https://github.com/TogetherSchool/jira-to-issues/blob/8a1c867eda5920acf9401eebc266afa06c5e7864/shared/jira.ts) to to point to your Jira server end-point and the ID of your Jira project.
5. In [shared/translate.ts](https://github.com/TogetherSchool/jira-to-issues/blob/8a1c867eda5920acf9401eebc266afa06c5e7864/shared/translate.ts), update the list of **valid labels you'd not like migrated**(_labelExclusionList/labelContentExclusionList_), the **mapping of existing labels/components to label names**(_labelMapping_), the **mapping of jira handles to github handles**(_assigneeToHandleMapping_), and the **list of valid assignees**(_assignable_) (i.e., people who either have triage access or more to the repo or who have previously interacted with issues in the repo. All other handles will be silently ignored by GitHub as part of their spam prevention).
6. Create a PAT with repo/issue access to your target repo. This can be done from https://github.com/settings/tokens/new
7. Set your token in an environment variable `GITHUB_TOKEN`: `export GITHUB_TOKEN=<PAT>`
8. Set your JIRA username in an environment variable `JIRA_USERNAME`: `export JIRA_USERNAME=<username>`
9. Set your JIRA password in an environment variable `JIRA_PASSWORD`: `export JIRA_PASSWORD=<password>`
10. The tool is ready to export all unresolved Jiras directly, or you can read from a CSV file as follows:
    1. On Jira using JQL identify the set of issues you want exported, and select to export to **CSV (all fields)**
    2. Save the file to your local machine and set environment variable `CSV_FILE`: `export CSV_FILE=<relative/path/to/file.csv>`
11. Run `npm install`
12. Run `npm run exec`

As long as you use the existing repo that you've cloned, the `exec` operation is resumable. So if you run into any issues during migration (e.g. your computer randomly restarts), you can resume the migration by running `npm run exec` again without risking duplicate issues.

### Testing the mapping

If you want to test the conversion for example to identify the correct set of labels to keep, do:
1. Export from Jira into csv-file
2. On [index.ts](https://github.com/TogetherSchool/jira-to-issues/blob/cf02015a53458eb348f2ab93acc8875961f5bb6c/index.ts) comment the call to `createIssues`
3. The output will display what labels will be used, and the list of generated GitHub issues
4. But no issues will be uploaded to GitHub
