# Hubiquitus-node

Hubiquitus-node is a Node.JS project that links a client that wants to perform
Publish-Subscribe operations to a XMPP Server. It allows the client to use 
WebSockets or BOSH to connect and lets him abstract the underlying structure
used by XMPP by only requiring the essential information to perform each action.

## Features

* Can be run separately from the XMPP Server, allowing more flexibility.

* Clients can connect using WebSockets or BOSH, allowing to use the best 
transport for the client type.

* By using **HubiquitusJS**  or **Hubiquitus-Node-Client** you can simplify the
messages the client sends and let **Hubiquitus-Node** take care of the rest.

* Several ports can be used for each transport, each running as a different
process increasing scalability!

## How to Install

To use **Hubiquitus-Node**, you need Node.JS and NPM.

```
$ npm install git://github.com/hubiquitus/hubiquitus-node.git	
```

## How to use

Once installed, all you need to do is run *gateway.js*:

```	
$ ./gateway.js
```

If you installed it globally (using 
`npm install -g git://github.com/hubiquitus/hubiquitus-node.git`)
you can run it with `$ hubiquitus-node`

When launched, the server waits for requests by all available transports
in all defined ports.

If you just want to use it as a BOSH endpoint, the only thing missing is
configuring your preferred client to connect to **Hubiquitus-Node**.

To take advantage of SocketIO, load-balancing and more, you need 
[hubiquitusjs](https://github.com/hubiquitus/hubiquitusjs), it's browser-client
counterpart, or node's client-side version 
[hubiquitus-node-client](https://github.com/hubiquitus/hubiquitus-node-client).

### Configuring

There are two ways to configure **Hubiquitus-Node**, you can pass command-line
arguments when running it or use a config file. The options, their format, 
their default values and their explanation can all be found in *lib/options.js*.

* Command-line arguments are always in the format `--option value`.

* Config files are comprised of key-values pairs in the format `key = value`.

```
Note: Blank lines or lines starting with '#' are ignored. 
Keys accepting arrays are specified by passing value1,value2,value3
```

### How to use with HubiquitusJS

1. Install **Hubiquitus-Node** in the server that will serve as a gateway.

2. Download **HubiquitusJS** and add it to your website. Assuming the *scripts*
folder of *hubiquitusjs* is at the root directory:

```html
<script src='scripts/socket.io.js'></script>
<script data-main="scripts/main" src='scripts/require.js'></script>
```

In `main.js` of *hubiquitusjs* change the options to match those of 
*hubiquitus-node* and add the XMPP Server values too.

Now it's ready to be used! try to connect from your client to the XMPP server!

For more information about how to use **HubiquitusJS**, go to the 
[repository](https://github.com/hubiquitus/hubiquitusjs).

## License 

Copyright (c) Novedia Group 2012.

This file is part of Hubiquitus.

Hubiquitus is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Hubiquitus is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Hubiquitus.  If not, see <http://www.gnu.org/licenses/>.
