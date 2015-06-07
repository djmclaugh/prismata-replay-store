# prismata-replay-store
Simple app that let's you store replays and have other people comment on them.

## Goals
This app is meant to help players share and comment on interesting replays. This app will also allow users to search for specific replays using multiple parameters such as units present, ranking, or time controls. Here are the key objectives I would like to satisfy:
* Allow beginers to search for relevant games with units they don't understand to see how they are used.
* Allow teams to share replays of interesting games so that they can comment on it and figure out as a team where the player went wrong.
* Storage of important games such as tournament games.

Here is what I do NOT want to accomplish:
* This app is not meant to be a database of all prismata games. For a replay to be on the website, the replay code must be entered. Therefore, if both players keep the replay code secret, the replay will never be on this site. I would also appreciate if people only add interesting games (whatever that means).
* This app is not meant to be an analytics tools. This app is not meant to figure out statistics like the percentage of p2 wins when Plasmafier is present.

## How to install
If you want to run your own private instance of the app, all you need is node.js and mongoDB.
Just fork the repository, npm install, edit config.json with appropriate values and you're good to go.
