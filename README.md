# Overview

proca-sync is a template for synchronising proca (the most advanced opensource online campaign tool) with your CRM or mailing-list tool. If your CRM is missing, fork it and adapt the CRM connector to your own setup.

## How it works

proca publishes every action taken by your supporters (petition signature, social share, double opt-in confirmation, etc.) to a RabbitMQ queue. Messages stay in the queue until proca-sync consumes them and passes them to your CRM.

- **You control the pace.** Consume as slowly or as quickly as your CRM accepts data. Messages wait in the queue until they are acknowledged. you can increase the concurrency to process more messages in parallel (default 1)
- **No REST API load.** Data is pushed to the queue, so you do not need to poll the proca REST API or request repeated exports.
- **Reliable delivery.** The provided node packages pass each message to your callback and handle ack/nack and graceful shutdown.
- **Volume.** RabbitMQ handles millions of queued actions.

The message format is documented at https://docs.proca.app/processing.html#action-message or use the data folder that contains examples.

## CRM connectors

Each connector lives in `src/crm/{yourcrm}.ts`. Its constructor declares which events to process: only opt-in contacts, all contacts, or contacts and events.

To use an existing connector, set `CRM={yourcrm}` in your `.env` file. To support a new CRM, add a connector and open a pull request.

# setup

if you want to use an existing CRM integration:

- pull this repository
- check the name of the CRM from /src/crm/{yourcrm}.ts
- cp .env.example .env.yourorg
- modify CRM={yourcrm} in your .env.yourorg and add an extra param -e yourorg to all the commands below
- depending of the CRM: add extra environment variables
- You need to know queue service credentials (name, username and password) from which to read from.

if you want to create an integration with a new CRM, it's almost the same, just clone and open a PR. See the [new CRM](#new-crm) section below.

# new CRM

The fastest start is to copy the annotated example connector and give it your CRM's name:

```
cp src/crm/stdout.ts src/crm/YourCrm.ts
```

- The file name must match the `CRM` value you set (case-sensitive on Linux): `CRM=YourCrm` loads `src/crm/YourCrm.ts`.
- Keep the default export (rename `export default StdOut` to `export default YourCrm`).
- The class name itself is not used to load the file, but matching it to the file keeps things readable.

`src/crm/stdout.ts` is commented and demonstrates the most common methods — use it as a base, check src/crm.ts for the complete reference

## What your connector processes

Set `crmType` in the constructor to declare which messages reach your connector:

| `crmType` | Processes |
| --- | --- |
| `CRMType.OptIn` | primary actions where the contact opted in |
| `CRMType.DoubleOptIn` | only double opt-in (`emailStatus === "double_opt_in"`) |
| `CRMType.Contact` | all primary actions, opt-in or not |
| `CRMType.ActionContact` | every action, including secondary ones (shares, ...) |

The base class dispatches to your methods based on this choice:

- `handleContact(message)` — called for each message your `crmType` selects. Return `true` to ACK it (processed, removed from the queue) or `false` to NACK it (kept and redelivered later; proca-sync may wait ~15 minutes via the dead-queue and move it to the back so one bad message doesn't block the rest).
- `init()` — optional, runs once before the first message. This is where you build your CRM client from the credentials in the environment and store anything you reuse on the instance (API key, base URL, list ids...), and where you fail fast if the credentials are wrong.
- `fetchCampaign(campaign)` — optional. A Proca message carries the campaign, not your CRM's list/segment/group id. Return whatever extra data you need; it is called lazily once per campaign name and cached, then read back with `await this.campaign(message.campaign)`.
- `handleEmailStatusChange` (inherited) handles opt-in confirmations and bounces through `setSubscribed` / `setBounce` if you implement them. Events that don't concern your CRM are ignored and removed from the queue. mostly useful for doubleopt-ins

## Configuration

Add to your .env.yourorg file:

```
CRM=YourCrm
PROCA_USERNAME='xxx'
PROCA_PASSWORD='secret'
PROCA_QUEUE='cus.nnn.deliver'
DRY_RUN=true            # example of a custom env variable, read in stdout init()
```

Add any connector-specific variables (API keys, base URL, list ids) to the same file and read them with `process.env` in `init`.

## Running during development

Against the real queue:

```
npm run start -- -e yourorg
```

or the much nicer option — replay a dumped message from `data/` without touching the server:

```
npm run test -- -e yourorg data/petition_optin.json
```

`npm run test` defaults to `data/petition_optin.json` if you pass no file. To capture real messages, run against the queue with `npm run start -- --dump` (or set `CRM=file`); they are written to `data/`.

> npm argument note: everything after `--` is passed to the script, e.g. `npm run start -- yourorg` (positional env) or `npm run start -- --env yourorg`.

The example messages live in `data/`, but your own actions from your widget/campaign will be more useful. Rename captured files by scenario (opt-in, opt-out, new contact, ...) so they're easy to replay.

You can also sign actions for real with the proca CLI (`npm install proca`, then `proca action`).

_please remove any personal data before adding examples to git — they usually contain personal data._

# build for production

```
$ npm run build
```

# run in production

put your env file in a path the user can read (we like /etc/proca-sync/[yourorg].env)
create a /etc/systemd/system/proca-sync.service

git clone proca-sync somewhere (we like /src/proca-sync)

```
Type=idle
Restart=always
RestartSec=10
User=proca-sync
Group=proca-sync
EnvironmentFile=/etc/proca-sync/[yourorg].env
WorkingDirectory=/srv/proca-sync
ExecStart=/srv/proca-sync/bin/sync

```

## extra configuration/filters

the `crmType` you set in the constructor of your CRM decides which messages it receives (only opt-in contacts, all contacts, or every action). See [What your connector processes](#what-your-connector-processes).

## add custom queue

We need to set up the custom delivery queue for your organisation if we are hosting your campaign, please contact us to do it for you

## ssh tunnel for development

if the rabbitmq port is blocked for some reason

1. create a ssh configuration to start the tunnel

    $ vi ~/.ssh/config

    Host rabbitmq
      HostName api.proca.app
      LocalForward 5671 localhost:5671


2. start the tunnel (once per session)

    $ssh -f -N rabbitmq

3. change your .env to define a different server

   PROCA_URL = localhost/proca_live

4. run with that new configuration

    $NODE_TLS_REJECT_UNAUTHORIZED=0 npm run start -- --e {your.config}

