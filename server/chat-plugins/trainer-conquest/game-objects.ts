import {FACILITY_TABLE, TCFacility} from "./facilities";
import {TrainerConquest} from "./game";
import {LABOR_TABLE, TCLabor} from "./labor";
import {TrainerConquestPlayer} from "./player";

export class TCKingdom {
	static readonly MAX_TRAINERS = 6;

	game: TrainerConquest;
	neighbors: TCKingdom[];
	owner: TrainerConquestPlayer | null;
	trainers: TCTrainer[];
	types: string[];
	facilities: TCFacility[];
	labor: TCLabor[];
	trainStats: StatID[];
	forceNextPokemon: {
		species: ID,
		gender: GenderName,
		nature?: string,
		ability?: ID,
	} | null;

	constructor(game: TrainerConquest, data: KingdomData) {
		this.game = game;
		this.types = data.types;
		this.neighbors = [];
		this.owner = null;
		this.trainers = [];
		this.facilities = data.facilities.map(id => new FACILITY_TABLE[id](this));
		this.labor = data.labor.map(id => new LABOR_TABLE[id](this));
		this.trainStats = data.trainStats;
		this.forceNextPokemon = null;
	}

	popFacility(args: string[]): TCFacility | null {
		const val = parseInt(args.shift() || '');
		if (isNaN(val)) return null;
		return this.facilities[val] || null;
	}

	requireFacility(args: string[]): TCFacility {
		const facility = this.popFacility(args);
		if (!facility) throw new Chat.ErrorMessage("Invalid facility ID.");
		return facility;
	}

	popLabor(args: string[]): TCLabor | null {
		const val = parseInt(args.shift() || '');
		if (isNaN(val)) return null;
		return this.labor[val] || null;
	}

	requireLabor(args: string[]): TCLabor {
		const labor = this.popLabor(args);
		if (!labor) throw new Chat.ErrorMessage("Invalid labor ID.");
		return labor;
	}

	onNextMonth() {
		for (const trainer of this.trainers) trainer.onNextMonth();
		for (const facility of this.facilities) facility.onNextMonth();
		for (const labor of this.labor) labor.onNextMonth();
	}

	destroy() {
		this.game = null!;
		this.neighbors = [];
		this.owner = null;
		for (const trainer of this.trainers) trainer.destroy();
		this.trainers = [];
		for (const facility of this.facilities) facility.destroy();
		this.facilities = [];
		for (const labor of this.labor) labor.destroy();
		this.labor = [];
		this.forceNextPokemon = null;
	}
}

export class TCTrainer {
	game: TrainerConquest;
	owner: TrainerConquestPlayer | null;
	kingdom: TCKingdom;
	name: string;
	party: TCPokemon[];
	// signature: TCPokemon;
	rank: 1 | 2 | 3;
	isLost: boolean;
	items: ID[];

	usedBasicAction: boolean;
	usedFacultyAction: boolean;
	usedBattleAction: boolean;

	constructor(name: string, kingdom: TCKingdom) {
		this.game = kingdom.game;
		this.owner = kingdom.owner;
		this.kingdom = kingdom;
		this.name = name;
		this.party = [];
		this.rank = 1;
		this.isLost = false;
		this.items = [];

		this.usedBasicAction = false;
		this.usedFacultyAction = false;
		this.usedBattleAction = false;
	}

	get num() {
		return this.kingdom.trainers.indexOf(this);
	}

	get signature() {
		return this.party[0];
	}

	get maxPokemon() {
		return [3, 5, 6][this.rank - 1];
	}

	popPokemon(args: string[]) {
		const val = parseInt(args.shift() || '');
		if (isNaN(val)) return null;
		if (val >= this.party.length) return null;
		return this.party[val];
	}

	requirePokemon(args: string[]) {
		const pokemon = this.popPokemon(args);
		if (!pokemon) throw new Chat.ErrorMessage("Invalid Pokemon.");
		return pokemon;
	}

	giveSignaturePokemon(species: string) {
		this.party.push(new TCPokemon(this, species, true));
	}

	getPackedTeam(): string {
		// TODO

		return '';
	}

	canBasicAction() {
		// TODO: implement Focused
		return !this.usedBasicAction && !this.usedBattleAction;
	}

	canFacultyAction() {
		// TODO: implement Focused
		return !this.usedFacultyAction && !this.usedBattleAction;
	}

	canBattleAction() {
		return !this.usedBasicAction && !this.usedFacultyAction && !this.usedBattleAction;
	}

	tryTrain() {
		if (!this.canBasicAction()) throw new Chat.ErrorMessage(`${this.name} doesn't have a Basic action left this turn.`);
		this.doTrain();
	}

	doTrain() {
		for (const pokemon of this.party) {
			pokemon.tryLevelUp();
			const evIncrease = [8, 12, 16][this.rank - 1];
			for (const stat of this.kingdom.trainStats) pokemon.tryIncrementEV(stat, evIncrease);
		}
	}

	tryCatch() {
		if (!this.canBasicAction()) throw new Chat.ErrorMessage(`${this.name} doesn't have a Basic action left this turn.`);
		// TODO is this what Conquester intends?
		if (this.party.length >= this.maxPokemon) throw new Chat.ErrorMessage(`${this.name}'s party is full`);
		this.doCatch();
	}

	doCatch() {
		let newPokemon;

		const forcePokemon = this.kingdom.forceNextPokemon;

		if (forcePokemon) {
			newPokemon = new TCPokemon(this, forcePokemon.species);
			if (forcePokemon.ability) newPokemon.ability = forcePokemon.ability;
			if (forcePokemon.nature) newPokemon.nature = forcePokemon.nature;
			this.kingdom.forceNextPokemon = null;
		} else {
			// generate random Pokemon from kingdom's types
			newPokemon = new TCPokemon(this, "Pikachu");
		}

		this.party.push(newPokemon);
	}

	tryRecruit() {
		if (!this.canBasicAction()) throw new Chat.ErrorMessage(`${this.name} doesn't have a Basic action left this turn.`);
		if (this.kingdom.trainers.length >= TCKingdom.MAX_TRAINERS) throw new Chat.ErrorMessage(`The kingdom is full.`);
		this.doRecruit();
	}

	doRecruit() {
		const newTrainer = new TCTrainer("Bunguloj", this.kingdom);
		newTrainer.giveSignaturePokemon("Pikachu");
		this.kingdom.trainers.push(newTrainer);
	}

	onNextMonth() {
		for (const pokemon of this.party) {
			pokemon.tryLevelUp();
		}
	}

	showDialog(args: string[]) {
		return '';
	}

	destroy() {
		this.game = null!;
		this.owner = null;
		this.kingdom = null!;
		for (const pokemon of this.party) pokemon.destroy();
		this.party = [];
	}
}

export class TCPokemon {
	game: TrainerConquest;
	trainer: TCTrainer | null;
	isSignature: boolean;
	species: Species;
	level: number;
	evs: StatsTable;
	ivs: StatsTable;
	nature: string;
	friendship: number;
	ability: string;
	item: ID;
	tutoredMoves: ID[];
	fainted: boolean;
	/** Used only for in-battle evo conditions */
	evoConditionMet: boolean;

	constructor(trainer: TCTrainer | null, species: string, isSignature = false) {
		this.trainer = trainer;
		this.game = trainer.game;
		this.isSignature = isSignature;

		this.species = this.game.dex.species.get(species);
		if (!this.species.exists) throw new Error(`Species ${species} does not exist`);

		this.level = 5;
		this.evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
		this.ivs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
		this.friendship = 0;
		this.item = '';
		this.tutoredMoves = [];

		// TODO random nature
		this.nature = 'Relaxed';

		if (this.species.abilities[1]) {
			this.ability = Math.floor(Math.random() * 2) ? this.species.abilities[1] : this.species.abilities[0];
		} else {
			this.ability = this.species.abilities[0];
		}

		if (isSignature) {
			this.incrementAllIVs();
		}

		this.fainted = false;
		this.evoConditionMet = false;
	}

	tryIncrementIV(stat: StatID, amount = 1) {
		this.ivs[stat] = Math.min(this.ivs[stat] + amount, 31);
	}

	incrementAllIVs(amount = 1) {
		let stat: StatID;
		for (stat in this.ivs) this.tryIncrementIV(stat, amount);
	}

	tryIncrementEV(stat: StatID, amount: number) {
		// TODO verify with Conquester
		const sumEVs = Object.values(this.evs).reduce((a, b) => a + b);
		if (sumEVs + amount > 510) amount = 510 - sumEVs;

		this.evs[stat] = Math.min(this.ivs[stat] + amount, 252);
	}

	tryIncrementFriendship(amount: number) {
		this.friendship = Math.min(this.friendship + amount, 255);
	}

	tryLevelUp(n = 1) {
		let maxLevel = 100;
		switch (this.trainer?.rank) {
		case 1:
			maxLevel = 25;
			break;
		case 2:
			maxLevel = 50;
			break;
		}
		if (!this.isSignature && this.trainer && this.trainer.signature.level < maxLevel) { maxLevel = this.trainer.signature.level; }

		this.level = Math.min(this.level + n, maxLevel);
	}

	canEvolveInto(evoName: string): boolean {
		if (!this.species.evos.map(toID).includes(toID(evoName))) return false;
		const species = this.game.dex.species.get(evoName);
		switch (species.evoType) {
		case "useItem":
			return this.trainer!.items.includes(toID(species.evoItem));
		case "levelHold":
			return this.item === toID(species.evoItem);
		case "levelMove":
			// TODO check level moves as well
			return this.tutoredMoves.includes(toID(species.evoMove));
		case "levelFriendship":
			return this.friendship >= 255;
		case "levelExtra": case "other":
			switch (species.id) {
			case 'mantine':
				return this.trainer!.party.some(poke => poke.species.id === 'remoraid');
				// TODO: probopass, crabominable, urshifu
			case 'sylveon':
				return this.tutoredMoves.some(moveID => this.game.dex.moves.get(moveID).type === "Fairy");
			case 'sirfetchd': case 'runerigus':
				return this.evoConditionMet;
			case 'alcremie':
				return this.item.endsWith('sweet');
			}
			return false;
		case "trade":
			// TODO check trading context somehow
			if (species.evoItem) return this.item === toID(species.evoItem);
			return true;
		default:
			if (species.evoLevel) return this.level >= species.evoLevel;
			return false;
		}
	}

	canEvolve(): string[] {
		return this.species.evos.filter(evoName => this.canEvolveInto(evoName));
	}

	evolveInto(targetSpecies: string) {
		if (!this.canEvolveInto(targetSpecies)) throw new Chat.ErrorMessage("Can't evolve");
		const oldName = this.species.name;
		this.species = this.game.dex.species.get(targetSpecies);
		// update new moves
		this.trainer!.owner!.resultText = `Success! Your ${oldName} evolved into ${this.species.name}!`;
		this.trainer!.owner!.resetPage();
	}

	showDetails() {
		return '';
	}

	showMovesDialog() {
		return '';
	}

	destroy() {
		this.game = null!;
		this.trainer = null;
	}
}
