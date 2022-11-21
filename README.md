 
proca is the most advanced opensource campaign tool (petition, twitterstorm, mailtotarget...).

Even if you use our SaaS services, you will want to automatically push supporters and actions into your CRM or mailinglist tool.

Doing it manually is cumbersome and time consuming. We do provide some synchronisation "out of the box", but because your CRM (or the way you configured it) is unique, it might make sense to have your own synchronisation system.

This code is meant to be forked and should let you develop a custom synchronisation more easily without having to write a lot of boilerplate code that is basically the same, no matter the CRM

# Overview

proca is sending all the actions taken by your supporters (signing a petition, sharing on a social media, confirming their email if double opt-in...) into a queue service (RabbitMQ software). they will stay there until you process them (using this code). You can process them as or slowy or fast as your CRM can handle them, RabbitMQ can easily handle million of actions without any problem.

Read more about how actions are processed and what is the format of the data [here](https://docs.proca.app/processing.html#action-message).

We provide node packages to help with passing messages from queue to your callback, and handle the ack, nack automatically, and graceful shutdown of synchronisation.

# setup

- fork this repository
- git clone the fork
- create a new src/crm/{yourcrm}.ts
- cp .env.example .env
- modify CRM={yourcrm} in your .env

You need to know queue service credentials (name, username and password) from which to read from.

# test and develop
read the queue and process it

```
$ yarn start
```

if you want to save the messages received into the data folder, set CRM=file or yarn start --dump


Now sign some actions (you can use proca cli `proca action` command to do this from command line quickly). To install the cli do `pip install proca` as root.

# build for production

```
$ yarn build
```

# run in production

```
$ ./proca-sync-template
```


## other run modes

instead of reading from the queue, read the message from a file

```
$yarn test data/petition_optin.json 
```

instead of processing the messages, save them into the data folder (useful to run yarn test later)

```
$yarn start --dump
```



## extra configuration/filters

the construtor of your CRM should set the type of events it want to process
TBD
