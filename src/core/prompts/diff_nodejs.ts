/**
 * The diffNodejsSource is a Node.js script that saves the structured diff of a Git repository to a JSON file.
 * The script uses the simple-git library to get the diff summary and full patch text for each file in the repository.
 * The structured diff is saved to a JSON file named git_diff.txt in the repository root directory.
 * 
 * Please read the output git diff whole file at 
 * /app/git_diff.txt
 */

export const diffNodejsSourceCode = `
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

// Set the repo path explicitly
const REPO_PATH = '/app/repo';
const git = simpleGit(REPO_PATH);

async function saveDiffAsText() {
  try {
    // Check if the repo has any commits
    let hasCommits = false;
    try {
      const log = await git.log();
      hasCommits = log.total > 0;
    } catch {
      hasCommits = false;
    }

    // Determine diff arguments
    const diffArgs = hasCommits ? ['HEAD'] : [];

    // Get the full diff as plain text
    const diffText = await git.diff(diffArgs);

    // Save plain text to output file
    const outputFile = '/app/git_diff.txt';
    fs.writeFileSync(outputFile, diffText);

    console.log('Saved git diff to ' + outputFile);
  } catch (err) {
    console.error('Error getting git diff:', err);
  }
}

saveDiffAsText();
`