/**
 * Randbats Workshop plugin
 * by Mathy (mathfreak231)
 */

import {Utils} from '../../lib';

class BattleWorkshop extends Rooms.RoomGame {
	battle: GameRoom | undefined;
	host: User;
	opponent: User;
	formatId: string;
	cancelled: boolean = false;
	hostTeam: string = '';

	constructor(room: Room, host: User, opponent: User, formatId: ID) {
		super(room);
		this.host = host;
		this.opponent = opponent;
		this.formatId = formatId;
	}

	startBattle() {
		this.cancelled = false;
		this.battle = Rooms.createBattle({
			format: this.formatId,
			isPrivate: this.room.settings.isPrivate,
			p1: {user: this.host},
			p2: {user: this.opponent},
			rated: false,
			challengeType: 'challenge',
			parentid: this.roomid,
			modchat: Users.PLAYER_SYMBOL,
		});

		if (!this.battle) throw new Error("Couldn't create the workshop battle");

		this.room.addRaw(Utils.escapeHTML(`<div class="broadcast-blue"><b>The battle has started! «<a href="/${this.battle.roomid}">${this.battle.roomid}</b></div>»`));
	}

	cancelBattle() {
		this.cancelled = true;
		this.battle?.battle!.tie();
		this.battle = undefined;
	}

	async getTeamExport() {
		let resultString;
		if (this.hostTeam) {
			resultString = this.hostTeam;
		} else {
			const team = await this.battle?.battle!.getTeam(this.host);
			if (!team) throw new Error("Couldn't get the host's team"); // shouldn't happen
			resultString = Utils.escapeHTML(Teams.export(team));
			this.hostTeam = resultString
		}
		return resultString;
	}

	onBattleWin(room: GameRoom, winnerid: ID) {
		if (this.cancelled) return;

		if (winnerid === this.host.id) {
			this.room.addRaw(Utils.escapeHTML(`<div class="broadcast-blue"><b>The winner of this workshop is the chat, hosted by ${this.host.name}!</b></div>»`));
		} else if (winnerid === this.opponent.id) {
			this.room.addRaw(Utils.escapeHTML(`<div class="broadcast-blue"><b>The winner of this workshop is the adversary, ${this.opponent.name}!</b></div>»`));
		} else {
			this.room.addRaw(Utils.escapeHTML(`<div class="broadcast-blue"><b>This workshop ended in a draw.</b></div>»`));
		}

		this.battle = undefined;
		this.destroy();
	}
}

export const commands: Chat.ChatCommands = {
	'workshop': {
		''(target, room, user) {
			return this.parse('/help workshop');
		},
		new: 'create',
		create(target, room, user) {
			room = this.requireRoom();
			this.checkCan('minigame', null, room);
			this.checkChat();
			if (room.game) throw new Chat.ErrorMessage("There is already a game in progress in this room.");

			const {targetUser, rest} = this.requireUser(target);

			if (!(targetUser.id in room.users)) throw new Chat.ErrorMessage("Your opponent must be in this room.");

			const formatId = toID(rest);
			const format = Dex.formats.get(formatId);
			if (format.effectType !== 'Format' || !format.team) {
				throw new Chat.ErrorMessage(`Format "${formatId}" is invalid or doesn't use random teams.`);
			}

			room.game = new BattleWorkshop(room, user, targetUser, formatId);
			this.addBox(`${user.name} is starting a ${format.name} Workshop battle against ${targetUser.name}!`);
			this.sendReply(`Once ${targetUser.name} leaves the room, type "/workshop start" to begin the battle.`);
		},
		end: 'cancel',
		cancel(target, room, user) {
			room = this.requireRoom();
			this.checkCan('minigame', null, room);
			this.checkChat();
			const game = this.requireGame(BattleWorkshop);
			game.cancelBattle();
			game.destroy();
			this.add("The workshop was forcibly ended.");
		},
		start(target, room, user) {
			room = this.requireRoom();
			this.checkCan('minigame', null, room);
			this.checkChat();
			const game = this.requireGame(BattleWorkshop);

			if (user !== game.host) throw new Chat.ErrorMessage("The battle can only be started by the host.");
			if (game.battle) throw new Chat.ErrorMessage(`The battle has already started. Use "/workshop restart" if you want to reroll the teams.`);

			if (game.opponent.id in room.users) throw new Chat.ErrorMessage(`Wait until ${game.opponent.name} leaves the room.`);

			game.startBattle();
		},
		restart(target, room, user) {
			room = this.requireRoom();
			this.checkCan('minigame', null, room);
			this.checkChat();
			const game = this.requireGame(BattleWorkshop);

			if (user !== game.host) throw new Chat.ErrorMessage("The battle can only be restarted by the host.");
			if (!game.battle) throw new Chat.ErrorMessage("The battle hasn't started yet.");

			room.add("The host restarted the battle.")
			game.cancelBattle();
			game.startBattle();
		},

		async team(target, room, user) {
			room = this.requireRoom();
			this.checkChat();
			const game = this.requireGame(BattleWorkshop);
			if (!game.battle) throw new Chat.ErrorMessage("The workshop battle hasn't started yet.");
			
			if (!this.runBroadcast()) return false;

			return this.sendReplyBox(await game.getTeamExport());
		}
	},
	'workshophelp': [
		"A <b>Workshop</b> is a battle where one user polls chat on what moves to pick and another leaves the room.",
		"Only battles with random teams are supported.",
		"Accepts the following commands:",
		"/workshop create [opponent], [format] - Create a workshop against the given user. Requires: % @ # &",
		"/workshop cancel - Destroys a workshop in progress. Requires: % @ # &",
		"/workshop start - Start the battle for the workshop. Must be the user that created it.",
		"/workshop restart - Cancel the workshop battle and immediately start another one. Must be the user that created it.",
		"/workshop team - Shows the host's team.",
		"!workshop team - Shows the host's team to everyone. Requires: + % @ # &",
	],
}