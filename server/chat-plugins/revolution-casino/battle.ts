/**
 * Battle connection for Revolution Casino
 * @author MathyFurret
 */

import {RoomBattle} from '../../room-battle';

export class BetBattle extends RoomBattle {
	constructor(room: GameRoom, options: BetBattleOptions) {
		const battleOptions = {
			format: options.format,
		};
		super(room, battleOptions);

		// set up the battle
		void this.stream.write(`>player p1 {"name":"Blue Team", "avatar":"blue", "team":"${options.teams[0]}}"`);
		void this.stream.write(`>player p2 {"name":"Red Team", "avatar":"red", "team":"${options.teams[1]}}"`);
	}

	choose(user: Users.User): void {
		// TODO
	}

	undo(user: Users.User): void {
		// TODO
	}

	joinGame(user: Users.User) {
		user.sendTo(this.room, "|error|To control this battle, place a bet first!");
		return false;
	}
}

export interface BetBattleOptions {
	format: string;
	teams: [string, string];
}

export function createBattle(parentRoom: ChatRoom, options: BetBattleOptions) {
	const roomid = Rooms.global.prepBattleRoom(options.format);
	const roomTitle = "Revolution Casino Battle";
	const room = Rooms.createGameRoom(roomid, roomTitle, {});
	const battle = new BetBattle(room, options);
	room.battle = battle;
	return room;
}
