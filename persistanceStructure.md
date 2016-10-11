roles:
    _id: role_id
	guild_id: guild_id
	level: level

guilds:
	_id: guild_id
	logs: channel

logs:
	_id: ?
	author_id: id
	timestamp: timestamp
	content: text

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
