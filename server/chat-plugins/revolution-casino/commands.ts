import {BetBattle, createBattle} from "./battle";

function notImplemented() {
	throw new Chat.ErrorMessage("Not implemented");
}

export const commands: Chat.ChatCommands = {
	bet(user, room) {
		notImplemented();
		// const battle = this.requireGame(BetBattle);
	},
	testpbr(target, room) {
		room = this.requireRoom();
		if (room.roomid !== 'revolutioncasino') {
			throw new Chat.ErrorMessage("This can only be used in the Revolution Casino room.");
		}
		this.checkCan("gamemanagement", null, room);
		createBattle(room as ChatRoom, {format: "gen8randombattle", teams: ['', '']});
	},
};
