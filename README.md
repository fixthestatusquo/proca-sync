 
proca is the most advanced opensource campaign tool (petition, twitterstorm, mailtotarget...).

Even if you use our SaaS services, you will want to automatically push supporters and actions into your CRM or mailinglist tool.

Doing it manually is cumbersome and time consuming. We do provide some synchronisation "out of the box", but because your CRM (or the way you configured it) is unique, it might make sense to have your own synchronisation system.

This code is meant to be forked and should let you develop a custom synchronisation more easily without having to write a lot of boilerplate code that is basically the same, no matter the CRM

# Overview

proca is sending all the actions taken by your supporters (signing a petition, sharing on a social media, confirming their email if double opt-in...) into a queue service (RabbitMQ software). they will stay there until you process them (using this code). You can process them as or slowy or fast as your CRM can handle them, RabbitMQ can easily handle million of actions without any problem.

Read more about how actions are processed and what is the format of the data [here](https://docs.proca.app/processing.html#action-message).

We provide node packages to help with passing messages from queue to your callback, and handle the ack, nack automatically, and graceful shutdown of synchronisation.

# setup

if you want to use an existing CRM integration:

- pull this repository
- check the name of the CRM from /src/crm/{yourcrm}.ts
- cp .env.example .env.yourorg
- modify CRM={yourcrm} in your .env.yourorg and add an extra param -e yourorg to all the commands below
- depending of the CRM: add extra environment variables
- You need to know queue service credentials (name, username and password) from which to read from.

if you want to create an integration with an new CRM, it's almost the same, gut please clone and PR.


# test and develop
read the queue and process it

```
$ npm run start [-e yourorg]
```

if you want to save the messages received into the data folder, set CRM=file or yarn start --dump


Now sign some actions (you can use proca cli `proca action` command to do this from command line quickly). To install the cli do `pip install proca` as root.

_tip: instead of reading from the queue, read the message from a file_

```
$npm run test data/petition_optin.json  [-e yourorg]
```

we provide a some example action/contact into data, however, it would likely be more useful to have your own actions from your widget/campaign coming from your queue

instead of processing the messages, save them into the data folder:

```
$npm run start --dump [-e yourorg]
```

by default, the name of the files are not clear, we suggest to rename them based on the type of action/context you want to test (eg an opt-in, opt-out, existing contact, new one...)

_please do not git add these files, they are likely to contain personal data_
 
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
