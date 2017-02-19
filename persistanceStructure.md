roles:
    _id: role_id
	guild_id: guild_id
	level: level

guilds:
	_id: guild_id
	log: channel
    roles: [role_id]
    limitedcolors: boolean
    topicchannel: channel_id channel_id
    invites: boolean
    whitelisted: []
    allowinvites: boolean
    automember: boolean
    greeting: string
    goodbye: string

channels:
    _id: channel_id,
    guild_id: guild_id
    disabled: []

logs:
	_id: message_id
	author_id: id
    channel_id: id
    guild_id: id
	timestamp: timestamp
	content: text
    edited: false
    deleted: boolean
    attachments: int
    edits: []

lognames:
    _id: ?
    user_id: id
    timestamp: timestamp
    nick: boolean
    if(nick):
        guild_id: id
        old: name
        new: name
    else:
        old: name
        new: name

warnings:
	_id: ?
	user_id: id
	timestamp: timestamp
	type: text
	time: int (?)
	reason: text

timers:
	_id: ?
	start_time: timestamp
	length: int

members:
    _id: guild_id
    users: [
        {
            _id: user_id
            isInGuild: true
            last_joined: timestamp
            last_left: timestamp
            joined: [timestamp]
            left: [timestamp]
            nicknames: []
            roles: []
        }
    ]

users:
    _id: user_id
    usernames: [string]
    coutry: string
