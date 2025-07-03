# jira-to-issues

Repo for migrating Jira issues to GitHub issues.  
This is a generalized version, based on the one specialized for use by the Apache Beam repo.  
It allows migrating Jira issues into multiple GitHub repositories based on the labels associated with each issue.  
It is capable of cross-referencing between different repositories when Jira sub-tasks have different labels.

---

## To Use the Tool

1. **Clone this repo**:
   ```bash
   git clone https://github.com/TogetherSchool/jira-to-issues && cd jira-to-issues
   ```

2. **Install dependencies**:  
   Run:
   ```bash
   npm install
   ```

3. **Update the target owner/repo**:  
   In [`shared/github.ts`](https://github.com/TogetherSchool/jira-to-issues/blob/8a1c867eda5920acf9401eebc266afa06c5e7864/shared/github.ts), update the `owner/repo` to point to your organization/repo where you want the issues created by default.

4. **Update `repoByLabel`**:  
   Define the labels that should cause the targeted repo to change (or set it to `{}` if not needed).

5. **Update Jira server and project details**:  
   In [`shared/jira.ts`](https://github.com/TogetherSchool/jira-to-issues/blob/8a1c867eda5920acf9401eebc266afa06c5e7864/shared/jira.ts), update the `jiraServer` and `jiraProject` to point to your Jira server endpoint and the ID of your Jira project.

6. **Update translation settings**:  
   In [`shared/translate.ts`](https://github.com/TogetherSchool/jira-to-issues/blob/8a1c867eda5920acf9401eebc266afa06c5e7864/shared/translate.ts), update the following:
    - **Excluded labels**: `labelExclusionList` and `labelContentExclusionList`.
    - **Label mapping**: `labelMapping` to map existing Jira labels/components to GitHub label names.
    - **Assignee mapping**: `assigneeToHandleMapping` to map Jira assignees to GitHub handles.
    - **Valid assignees**: `assignable` list of GitHub users with triage access or prior issue interaction (other handles will be ignored by GitHub’s spam prevention).

7. **Create a GitHub PAT**:  
   Generate a Personal Access Token (PAT) with `repo` and `issue` access from [GitHub Token Settings](https://github.com/settings/tokens/new).

8. **Set the GitHub token**:  
   Export the token as an environment variable:
   ```bash
   export GITHUB_TOKEN=<PAT>
   ```

9. **Set the Jira username**:  
   Export your Jira username as an environment variable:
   ```bash
   export JIRA_USERNAME=<username>
   ```

10. **Set the Jira password**:  
    Export your Jira password as an environment variable:
    ```bash
    export JIRA_PASSWORD=<password>
    ```

11. **Export preselected Jira issues**:  
    The tool can export all unresolved Jira issues directly from the Jira server or can use a local CSV file:
    1. In Jira, use JQL to identify the issues you want to export, and export them as `CSV (all fields)`.
    2. Save the file locally and set the environment variable:
       ```bash
       export CSV_FILE=<relative/path/to/file.csv>
       ```

12. **Run the migration**:  
    Execute the migration script:
    ```bash
    npm run exec
    ```

---

## Resumable Migration
If you encounter issues during migration (e.g., your computer restarts), you can resume the process by running `npm run exec` again without risking duplicate issues.

---

## Testing the Mapping
To test the conversion (e.g., to verify the correct set of labels):
1. Export the Jira issues to a CSV file.
2. In [`index.ts`](https://github.com/TogetherSchool/jira-to-issues/blob/cf02015a53458eb348f2ab93acc8875961f5bb6c/index.ts), comment out the call to `createIssues`.
3. Run `npm run exec`
4. The output will display the labels to be used and the list of generated GitHub issues.
5. No issues will be uploaded to GitHub.
