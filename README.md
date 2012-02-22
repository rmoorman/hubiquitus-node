# Hubiquitus-node

Hubiquitus-node is a Node.JS project that links a client that wants to perform
Publish-Subscribe operations to a XMPP Server. It allows the client to use 
WebSockets or BOSH to connect and lets him abstract the underlying structure
used by XMPP by only requiring the essential information to perform each action.

## Features

* Can be run separately from the XMPP Server, allowing more flexibility.

* Clients can connect using WebSockets or BOSH, allowing to use the best 
transport for the client type.

* By using `hubiquitusjs` you can simplify the messages the client sends
and let `hubiquitus-node` take care of the rest.

## How to Install

To use this application, you need Node.JS and NPM.

As of right now the project is not published in NPM, so you need to clone
it from github.

	$ git clone git://github.com/hubiquitus/hubiquitus-node.git
	$ cd hubiquitus-node
	$ npm install log4js
	$ npm install socket.io
	$ npm install node-xmpp
	$ npm install node-xmpp-bosh

## How to use

Once the correct dependencies have been installed, all you need to do
is run `main.js`:
	```	
	$ node main.js
	```
Once it's running, the server is waiting for requests using all available
transports. To configure the application, look at main.js for the options.

As of right now, to take full advantage of hubiquitus-node you need to use 
`hubiquitusjs`, its browser-client counterpart. Read it's doc to see how to
connect to the server.

If you just want to use BOSH as a transport method and run hubiquitus-node
as a bridge, you can use any client that speaks XMPP and uses BOSH, putting
the correct parameters in the client.

### How to use with Hubiquitusjs

Install `hubiquitus-node` in the server that will serve as a bridge.
Download `hubiquitusjs` and add it to your website. In the webpage that
you want to use the connection, add this to the header:

```html
<script src='scripts/socket.io.js'></script>
<script data-main="scripts/main" src='scripts/require.js'></script>
```

For this to work, the `scripts` folder of hubiquitusjs must be in
the website root.

The client needs to be configured to match the configuration of the server.
In `main.js` of hubiquitusjs change the values to those that are in the file
`options.js` of hubiquitus-node (Assuming you used the default values) and
add the XMPP Server values too.

Now it's ready to be used! try to connect from your client to the XMPP server!

Don't fear the options.js file! try to change it to fit your needs.

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
