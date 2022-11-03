proca is the most advanced opensource campaign tool (petition, twitterstorm, mailtotarget...).

Even if you use our SaaS services, you will want to automatically push supporters and actions into your CRM or mailinglist tool.

Doing it manually is cumbersome and time consuming. We do provide some synchronisation "out of the box", but because your CRM (or the way you configured it) is unique, it might make sense to have your own synchronisation system.

This code is meant to be forked and should let you develop a custom synchronisation more easily without having to write a lot of boilerplate code that is basically the same, no matter the CRM

# Overview

proca is sending all the actions taken by your supporters (signing a petition, sharing on a social media, confirming their email if double opt-in...) into a rabbitMQ queue. they will stay there until you process them (using this code). You can process them as or slowy or fast as your CRM can handle them, RabbitMQ can easily handle million of actions without any problem.

TODO: The format of each event is described here... there are some example json of the messages in the folder data

This synchroniser waits on the queue, take the next message and hand it over to the function XYZ that can format the data and calls the REST API of your CRM.

TODO: how to handle errors? when to ack/nak=

# setup

- fork this repository (please call it proc-sync-{name-of-your-CRM}
- git clone the fork
- cp en.example into .env

in that .env file, you need to (at least)
- rabbitMQ credentials (ask our support  at if you are running on our SaaS)
- todo ??

## extra configuration/filters

proca sends all events to the queue. In most synchroniser, only some of the events are actually needed:

- primary="include"|"exclude"
- secondary="include"|"exclude"
- optin_only
- double_optin_only

# test and develop
read the queue and process it

$yarn start  

read the queue and process it, display a lot of message

$yarn start --verbose 

instead of reading from the queue, read the message from a file
$yarn test data/example-signature.json 

instead of processing the messages, save them into the data folder (useful to run yarn test later)
$yarn dump 












