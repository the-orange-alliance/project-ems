import { Octokit } from '@octokit/core';
import { DateTime } from 'luxon';

const octokit = new Octokit({ auth: import.meta.env.VITE_GITHUB_TOKEN });

export const useGitHubDownload = () => {
  const download = async () => {
    const releases = await octokit.request(
      'GET /repos/{owner}/{repo}/releases',
      {
        owner: 'the-orange-alliance',
        repo: 'project-ems',
        release_id: 0,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    const [latestRelease] = releases.data.sort(
      (a, b) =>
        DateTime.fromISO(b.created_at).toMillis() -
        DateTime.fromISO(a.created_at).toMillis()
    );
    return latestRelease.assets[0].browser_download_url;
  };

  return download;
};
