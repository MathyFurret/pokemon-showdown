import { TrainerConquest } from "./game";

export const pages: Chat.PageTable = {
	trainerconquest(args, user) {
		if (!user.named) return Rooms.RETRY_AFTER_LOGIN;
		const room = this.requireRoom();
		const game = room.getGame(TrainerConquest);
		if (!(user.id in room.users) || !game || !game.started) return this.close();
		if (!(user.id in game.playerTable)) return game.getSpectatePage();
		const player = game.playerTable[user.id];
		if (player.pageHTML) return player.pageHTML;
		let buf = `<div class="pad">`;
		if (player.resultText) buf += `<div class="broadcast-green"><b style="font-size:1.3em">${player.resultText}</b></div>`;
		if (player.pageHTML) {
			buf += player.pageHTML;
			player.pageHTML = ''; // should only show once
		} else if (game.currentKingdom.owner !== player) {
			return game.getSpectatePage(player);
		} else {
			const defaultpage = `view-trainerconquest-${room.roomid}`;
			args.shift();
			switch (args.shift()) {
				case 'facility': {
					const facility = game.popFacility(args);
					if (!facility) return this.resolve(defaultpage);
					const trainer = game.popTrainer(args);
					buf += facility.showDialog(trainer || undefined, args);
					break;
				}
				case 'labor': {
					const labor = game.popLabor(args);
					if (!labor) return this.resolve(defaultpage);
					const trainer = game.popTrainer(args);
					buf += labor.showDialog(trainer || undefined, args);
					break;
				}
				case 'trainer': {
					const trainer = game.popTrainer(args);
					if (!trainer) return this.resolve(defaultpage);
					buf += trainer.showDialog(args);
					break;
				}
				case 'pokemon': {
					const trainer = game.popTrainer(args);
					if (!trainer) return this.resolve(defaultpage);
					const pokemon = trainer.popPokemon(args);
					if (!pokemon) return this.resolve(defaultpage + `-trainer-${trainer.num}`);
					buf += pokemon.showDetails();
					break;
				}
				case 'pokemonmoves': {
					const trainer = game.popTrainer(args);
					if (!trainer) return this.resolve(defaultpage);
					const pokemon = trainer.popPokemon(args);
					if (!pokemon) return this.resolve(defaultpage + `-trainer-${trainer.num}`);
					buf += pokemon.showMovesDialog();
					break;
				}
				default: {
					// show default kingdom page
				}
			}
		}
		buf += '</div>';
		return buf;
	},
}