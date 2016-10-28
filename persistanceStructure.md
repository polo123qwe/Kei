roles:
    _id: role_id
	guild_id: guild_id
	level: level

guilds:
	_id: guild_id
	logs: channel
    roles: [role_id]
    color: boolean
    topicchannel: channel_id channel_id

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

users
