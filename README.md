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

if you want to create an integration with an new CRM, it's almost the same, gut please clone and PR.

# new CRM

create a new file in /src/crm/YourCrm.ts, the easiest is to start by copying src/crm/StdOut.ts and rename the class to YourCrm and export it as default.

the method handleContact is going to be called everytime there is a new action to process as long as you run the program. You don't have to run it 24/7, next time you run it all the new actions that you haven't processed will be waiting for you.

if it returns true, the action is considered processed and we remove it from the queue. if you return false, it means you failed to process it and it will stay in the queue (we might pause it for 15 minutes and put it at the back of the queue to avoid having a single action that blocks the processing of all the other actions).

to run it, add in your .env:

    CRM=YourCrm
    PROCA_USERNAME='xxx'
    PROCA_PASSWORD='secret'
    PROCA_QUEUE='yyy'

you can also add the credential to your CRM 

to run it and test from the queue, run

    $npm run start

having to connect to the server, and potentially creating new actions is a bit tedious during the development. 

    $npm run test 

instead of opening a connection to the server, it takes the event from data/petition_optin.json (or any other dump of one event you want to use) and runs it with your handleContact 









read the queue and process it

```
$ npm run start -- [-e yourorg]
```

if you want to save the messages received into the data folder, set CRM=file or yarn start --dump

Now sign some actions (you can use proca cli `proca action` command to do this from command line quickly). To install the cli do `npm install proca`

_tip: instead of reading from the queue, read the message from a file_ during the development, it's way way more enjoyable and you can replay with the same data as often as needed.

```
$npm run test data/petition_optin.json  [-e yourorg]
```

we provide a some example action/contact into data, however, it would likely be more useful to have your own actions from your widget/campaign coming from your queue

instead of processing the messages, save them into the data folder:

```
$npm run start --dump [-e yourorg]
```

by default, the name of the files are not clear, we suggest to rename them based on the type of action/context you want to test (eg an opt-in, opt-out, existing contact, new one...)

_please remove any personal data if you add your examples to git, , they are likely to contain personal data_

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

the construtor of your CRM should set the type of events it want to process (eg only opt-in contacts, all contacts or contacts and events)

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

