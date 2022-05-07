import {ModdedDex} from "../../../sim/dex";
import {User} from "../../users";
import {TCFacility} from "./facilities";
import {TCKingdom, TCTrainer} from "./game-objects";
import {TCLabor} from "./labor";
import {TrainerConquestPlayer} from "./player";

export class AwaitChoice {
	forPlayer: TrainerConquestPlayer;
	callback: (this: TrainerConquest, choice: string) => boolean;

	constructor(player: TrainerConquestPlayer, callback: (this: TrainerConquest, choice: string) => boolean) {
		this.forPlayer = player;
		this.callback = callback;
	}
}

export class TrainerConquest extends Rooms.RoomGame<TrainerConquestPlayer> {
	readonly dex: ModdedDex = Dex;
	kingdoms: TCKingdom[];
	started: boolean;
	turn: number;
	awaitChoices: AwaitChoice[];
	currentKingdomID: number;

	constructor(room: Room) {
		super(room);
		this.kingdoms = [];
		this.started = false;
		this.turn = 0;
		this.currentKingdomID = 0;
		this.awaitChoices = [];
	}

	get currentKingdom() {
		return this.kingdoms[this.currentKingdomID];
	}

	makePlayer(user: string | User | null): TrainerConquestPlayer {
		return new TrainerConquestPlayer(user, this);
	}

	start() {
		if (this.players.length < 2) throw new Chat.ErrorMessage("Not enough players to start!");
		this.started = true;
		for (const player of this.players) {
			player.resetPage();
		}
	}

	popTrainer(args: string[]): TCTrainer | null {
		const val = parseInt(args.shift() || '');
		if (isNaN(val)) return null;
		return this.currentKingdom.trainers[val] || null;
	}

	requireTrainer(args: string[]): TCTrainer {
		const trainer = this.popTrainer(args);
		if (!trainer) throw new Chat.ErrorMessage("Invalid Trainer ID.");
		return trainer;
	}

	popKingdom(args: string[]): TCKingdom | null {
		const val = parseInt(args.shift() || '');
		if (isNaN(val)) return null;
		return this.kingdoms[val] || null;
	}

	requireKingdom(args: string[]): TCKingdom {
		const kingdom = this.popKingdom(args);
		if (!kingdom) throw new Chat.ErrorMessage("Invalid kingdom ID.");
		return kingdom;
	}

	nextKingdom() {
		this.currentKingdomID++;
		if (this.currentKingdomID >= this.kingdoms.length) {
			this.nextMonth();
		}
		if (!this.currentKingdom.owner) return this.nextKingdom();
		// announce whose turn it is
		// update all player's pages
	}

	nextMonth() {
		this.turn++;
		// anounce next month
		// possibly generate a board event
		this.currentKingdomID = 0;
		for (const kingdom of this.kingdoms) {
			kingdom.onNextMonth();
		}
	}

	choose(user: User, choice: string) {
		if (!(user.id in this.playerTable)) throw new Chat.ErrorMessage("You aren't in this game of Trainer Conquest.");
		if (!this.started) throw new Chat.ErrorMessage("The game hasn't started yet.");
		const player = this.playerTable[user.id];

		if (this.awaitChoices) {
			const nextChoice = this.awaitChoices[0];
			if (user.id !== nextChoice.forPlayer.id) throw new Chat.ErrorMessage("It's not your turn.");

			if (nextChoice.callback.call(this, choice)) this.awaitChoices.shift();
			return;
		}

		if (user.id !== this.currentKingdom.owner!.id) throw new Chat.ErrorMessage("It's not your turn.");

		const args = choice.split(/\s+/);
		if (!args) throw new Chat.ErrorMessage("Invalid choice.");

		switch (args[0]) {
		// Basic Actions

		case 'train':
			this.requireTrainer(args).tryTrain();
			player.resultText = `Training successful. (placeholder msg)`;
			player.resetPage();
			return;
		case 'catch':
			this.requireTrainer(args).tryCatch();
			// display new Pokemon
			return;
		case 'recruit':
			this.requireTrainer(args).tryRecruit();
			return;

			// Faculty Actions

		case 'facility': {
			const trainer = this.requireTrainer(args);
			const facility = this.currentKingdom.requireFacility(args);
			player.resultText = facility.doAction(trainer, args);
			player.resetPage();
			return;
		}
		case 'labor': {
			const trainer = this.requireTrainer(args);
			const labor = this.currentKingdom.requireLabor(args);
			labor.activate(trainer, args);
			return;
		}
		case 'movepokemon': {
			const trainer1 = this.requireTrainer(args);
			const trainer2 = this.requireTrainer(args);
			// do pokemon move
			return;
		}
		case 'moveitem': {
			const trainer1 = this.requireTrainer(args);
			const trainer2 = this.requireTrainer(args);
			const itemid = toID(args.shift());
			if (!itemid) throw new Chat.ErrorMessage("No item specified.");
			trainer1.transferItem(trainer2, itemid);
			return;
		}
		case 'move': {
			const trainer = this.requireTrainer(args);
			const kingdom = this.requireKingdom(args);
			trainer.moveTo(kingdom);
			return;
		}

		// Battle Actions

		case 'sabotage': {
			const targetKingdom = this.requireKingdom(args);
			if (!targetKingdom.owner ||
						targetKingdom.owner === this.currentKingdom.owner ||
						!targetKingdom.isAdjacent(this.currentKingdom)) { throw new Chat.ErrorMessage("Invalid kingdom."); }
			const targetType = args.shift()?.trim();
			let target: TCFacility | TCLabor;
			switch (targetType) {
			case 'facility':
				target = targetKingdom.requireFacility(args);
				break;
			case 'labor':
				target = targetKingdom.requireLabor(args);
				break;
			default:
				throw new Chat.ErrorMessage("Target type must be 'facility' or 'labor'");
			}
			const trainer1 = this.requireTrainer(args);
			const trainer2 = this.popTrainer(args);
			if (trainer2) {
				this.initSabotage(target, [trainer1, trainer2]);
			} else {
				this.initSabotage(target, [trainer1]);
			}
			return;
		}
		case 'reclaim':
			return;

		case 'rankup': {
			const trainer = this.requireTrainer(args);
			// filler formula to use with no host
			let chance = 0;
			switch (trainer.rank) {
			case 1: {
				for (const pokemon of trainer.party) {
					chance += (pokemon.level - 15) * 1.5 + 5;
					chance += (pokemon.friendship - 5) / 24;
					chance += Object.values(pokemon.evs).reduce((a, b) => a + b) / 20;
					// check for item
				}
				break;
			}
			case 2: {
				for (const pokemon of trainer.party) {
					if (pokemon.level > 40) chance += (pokemon.level - 40) * 0.4;
					chance += (pokemon.level - 15) * 1.5 + 5;
					chance += (pokemon.friendship) / 51;
					chance += Object.values(pokemon.evs).reduce((a, b) => a + b) / 120;
					// check for item
				}
				break;
			}
			case 3:
				throw new Chat.ErrorMessage(`${trainer.name} can't rank up anymore`);
			}
			if (Math.random() * 100 > chance) {
				// success!
				trainer.rank++;
			} else {
				// failure...
			}
			return;
		}

		case 'conquer': {
			const targetKingdom = this.requireKingdom(args);
			if (!targetKingdom.owner ||
					targetKingdom.owner === this.currentKingdom.owner ||
					!targetKingdom.isAdjacent(this.currentKingdom)) { throw new Chat.ErrorMessage("Invalid kingdom."); }

			const attackingTrainers = [];
			let trainer;
			while ((trainer = this.requireTrainer(args))) attackingTrainers.push(trainer);
			if (!attackingTrainers.length) throw new Chat.ErrorMessage("You must send at least one trainer");
			this.initConquest(targetKingdom, attackingTrainers);
			return;
		}

		// Other choices

		case 'useskill':
			return;

		case 'moveset': {
			const trainer = this.requireTrainer(args);
			const pokemon = trainer.requirePokemon(args);
			pokemon.setMoves(args);
			return;
		}

		case 'giveitem': {
			const trainer = this.requireTrainer(args);
			const pokemon = trainer.requirePokemon(args);
			const itemid = toID(args.join(' '));
			if (!itemid || !trainer.items.includes(itemid)) throw new Chat.ErrorMessage("Invalid item.");
			trainer.items.splice(trainer.items.indexOf(itemid), 1);
			pokemon.item = itemid;
			return;
		}

		case 'takeitem': {
			const trainer = this.requireTrainer(args);
			const pokemon = trainer.requirePokemon(args);
			if (!pokemon.item) throw new Chat.ErrorMessage("Pokemon has no item.");
			trainer.items.push(pokemon.item);
			pokemon.item = '';
			return;
		}

		case 'evolve':
			const trainer = this.requireTrainer(args);
			const pokemon = trainer.requirePokemon(args);
			const targetSpecies = args.shift()?.trim();
			if (!targetSpecies) throw new Chat.ErrorMessage("Must give the target species");
			pokemon.evolveInto(targetSpecies);
			return;

		case 'done':
			this.nextKingdom();
			return;
		}
		throw new Chat.ErrorMessage("Unrecognized command.");
	}

	awaitChoice(player: TrainerConquestPlayer, callback: (this: TrainerConquest, choice: string) => boolean, dialog: string) {
		player.pageHTML = dialog;
		this.awaitChoices.push(new AwaitChoice(player, callback));
	}

	initSabotage(target: TCFacility | TCLabor, attackingTrainers: TCTrainer[]) {
		// check if player has already sabotaged it this month
		if (target.sabotageCount >= 6) throw new Chat.ErrorMessage("That facility can't be sabotaged anymore");
		const buf = `<p>Your ${target.name} in ${target.kingdom.name} is being sabotaged!</p>`;
		// Choose Trainers to defend
		this.awaitChoice(target.kingdom.owner!, function (choice) {
			const args = choice.split(/\s+/);
			const defendingTrainers = [];
			return false;
		}, buf);
	}

	initConquest(targetKingdom: TCKingdom, attackingTrainers: TCTrainer[]) {
		// set up some kind of object to track the conquest battle
		// prompt attacker to choose trainers to fight
		// create battle room

	}

	updateConquest(battleRoom: GameRoom, winnerid: ID) {
		// Scrub the battle log to figure out who fainted
		// update fainted pokemon and eliminate trainers
		// if one side's trainers are all eliminated, the winner is the winner of the battle
		// prompt next player to select trainers to fight
	}

	createBattle(trainer1: TCTrainer, trainer2: TCTrainer) {
		const format = "gen8customgame";

		if (!trainer1.owner || !trainer2.owner) throw new Error("Trainers must be owned by players");

		const room = Rooms.createBattle({
			format: format,
			isPrivate: "hidden",
			p1: {
				user: this.room.users[trainer1.owner.id],
				team: trainer1.getPackedTeam(),
				hidden: true,
				inviteOnly: true,
			},
			p2: {
				user: this.room.users[trainer2.owner.id],
				team: trainer2.getPackedTeam(),
				hidden: true,
				inviteOnly: true,
			},
			rated: false,
			challengeType: "unrated",
			parentid: this.roomid,
		});
		if (!room?.battle) throw new Error(`Failed to create battle in ${room}`);
	}

	onBattleWin(battleRoom: GameRoom, winnerid: ID) {
		// process the result of the battle

		// if there is a conquest going on, call updateConquest
	}

	getSpectatePage(player?: TrainerConquestPlayer) {
		return '';
	}

	end() {
		// close pages for each player
		this.destroy();
	}

	destroy() {
		for (const kingdom of this.kingdoms) kingdom.destroy();
		this.kingdoms = [];
	}
}
