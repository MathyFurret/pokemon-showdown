import { TrainerConquest } from "./game";

export const commands: Chat.ChatCommands = {
	tc: 'trainerconquest',
	trainerconquest: {
		'': 'help',
		help(target, room, user) {
			return this.parse('/help trainerconquest')
		},
		new: 'create',
		create(target, room, user) {
			room = this.requireRoom();
			this.checkCan('gamemanagement', null, room);
			if (room.game) throw new Chat.ErrorMessage("There is already a game in this room!");

			room.game = new TrainerConquest(room);
			this.addModAction(`A game of Trainer Conquest was started by ${user.name}. Join with "/tc join".`);
		},
		start(target, room, user) {
			room = this.requireRoom();
			this.checkCan('gamemanagement', null, room);
			const game = this.requireGame(TrainerConquest);
			game.start();
			this.addModAction(`The game of Trainer Conquest has begun!`);
		},
		end(target, room, user) {
			room = this.requireRoom();
			this.checkCan('gamemanagement', null, room);
			const game = this.requireGame(TrainerConquest);
			game.end();
			this.addModAction(`The game of Trainer Conquest was forcibly ended by ${user.name}.`);
			room.game = null;
		},
		join(target, room, user) {
			room = this.requireRoom();
			this.checkChat();
			const game = this.requireGame(TrainerConquest);
			if (game.started) throw new Chat.ErrorMessage("This game has already started.");
			game.addPlayer(user);
			this.sendReply("You joined the game of Trainer Conquest.");
		},
		leave(target, room, user) {
			room = this.requireRoom();
			this.checkChat();
			const game = this.requireGame(TrainerConquest);
			if (!(user.id in game.playerTable)) throw new Chat.ErrorMessage("You aren't in this game.");
			game.removePlayer(user);
			this.sendReply("You left the game of Trainer Conquest.");
		}
	},
	trainerconquesthelp: [
		"/trainerconquest create - Makes a new Trainer Conquest game. Requires % @ # &",
		"/trainerconquest start - Starts the Trainer Conquest game. Requires % @ # &",
		"/trainerconquest end - Forcibly ends a Trainer Conquest game. Requires % @ # &",
		"/trainerconquest join - Join the Trainer Conquest game.",
		"/trainerconquest leave - Leave the Trainer Conquest game."
		
	],
};