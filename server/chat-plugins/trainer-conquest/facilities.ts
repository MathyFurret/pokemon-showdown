import {TCTrainer, TCKingdom, TCPokemon} from './game-objects';

function countTrue<T>(arr: T[], callback: (val: T) => boolean = x => !!x): number {
	return arr.reduce((prev, cur) => (callback(cur) ? prev + 1 : prev), 0);
}

export abstract class TCFacility {
	kingdom: TCKingdom;
	cooldown: number;
	sabotageCount: number;

	abstract name: string;

	get id() {
		return toID(this.name);
	}

	onNextMonth(): void {}

	decrementCooldowns() {
		if (this.sabotageCount > 0) this.sabotageCount--;
		else if (this.cooldown > 0) this.cooldown--;
	}

	constructor(kingdom: TCKingdom) {
		this.kingdom = kingdom;
		this.cooldown = 0;
		this.sabotageCount = 0;
	}

	get num() {
		return this.kingdom.facilities.indexOf(this);
	}

	abstract showDialog(trainer?: TCTrainer, args?: string[]): string;

	abstract doAction(trainer: TCTrainer, args: string[]): string;

	destroy() {
		this.kingdom = null!;
	}
}

abstract class TCBaseItemShop extends TCFacility {
	availableItems: ID[];

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.availableItems = [];
	}

	// Item shops must populate their inventories
	abstract onNextMonth(): void;

	// args: none
	showDialog(trainer?: TCTrainer) {
		let buf = '';
		buf += `<h1>${this.name}</h1>`;
		buf += `<p><i>Welcome to the ${this.name}! Here are our wares today:</i></p>`;
		if (trainer) {
			buf += `<p><small>Click an item to take it. Once you do, it will no longer be available this month.</small></p><p>`;
			for (const itemID of this.availableItems) {
				// TODO: Should be a table
				buf += `<button class="button" name="send" value="/msgroom ${this.kingdom.game.roomid}, /choose facility ${trainer.num} ${this.num} ${itemID}" style="width:150px;max-width:100%">${Dex.items.get(itemID).name}</button><br>`;
			}
		} else {
			// TODO: Display as a table
			buf += `<p><ul>`;
			for (const itemID of this.availableItems) {
				buf += `<li>${Dex.items.get(itemID).name}</li>`;
			}
			buf += `</ul>`;
		}
		buf += `<a href="/view-trainerconquest-${this.kingdom.game.roomid}" target="replace"><button class="button">Go back</button></a></p>`;
		return buf;
	}

	// args: itemID
	doAction(trainer: TCTrainer, args: string[]) {
		const itemID = toID(args.shift());
		if (!this.availableItems.includes(itemID)) throw new Chat.ErrorMessage(`Item ${itemID} not available at that facility`);
		this.availableItems.splice(this.availableItems.indexOf(itemID), 1);
		trainer.items.push(itemID);
		return `${trainer.name} received the ${Dex.items.get(itemID).name}.`;
	}
}

abstract class TCMoveTutor extends TCFacility {
	availableMoves: ID[];

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.availableMoves = [];
	}

	// Move tutors must populate their move tables
	abstract onNextMonth(): void;

	// args: pokemonid, moveid
	doAction(trainer: TCTrainer, args: string[]) {
		const pokemon = trainer.requirePokemon(args);
		const moveID = toID(args.shift());
		if (!this.availableMoves.includes(moveID)) throw new Chat.ErrorMessage(`Move ${moveID} not available at that facility`);
		// TODO verify learnability on that Pokemon
		pokemon.tutoredMoves.push(moveID);
		return `${trainer.name}'s ${pokemon.species.name} learned ${Dex.moves.get(moveID).name}.`;
	}
}

class TCFarmersMarket extends TCBaseItemShop {
	name = "Farmer's Market";
}

class TCTechniqueTutor extends TCMoveTutor {
	name = "Technique Tutor";
}

class TCBonusShrine extends TCFacility {
	name = "Bonus Shrine";
}

class TCTradeCenter extends TCFacility {
	name = "Trade Center";
}

class TCCommunications extends TCFacility {
	name = "Communications";
}

class TCTomb extends TCBaseItemShop {
	name = "Tomb";
}

class TCMysticForest extends TCFacility {
	name = "Mystic Forest";

	doAction(trainer: TCTrainer, args: string[]) {
		const pokemon = trainer.requirePokemon(args);

		const abilityID = toID(args.shift());
		const natureID = toID(args.shift());
		if (!abilityID || !natureID) throw new Chat.ErrorMessage(`Not enough arguments.`);

		if (!(abilityID === toID(pokemon.species.abilities[0]) ||
				abilityID === toID(pokemon.species.abilities[1]))) {
			throw new Chat.ErrorMessage(`Invalid ability for ${pokemon.species.name}: ${abilityID}`);
		}

		const nature = this.kingdom.game.dex.natures.get(natureID);
		if (!nature.exists) throw new Chat.ErrorMessage(`Invalid nature: ${natureID}`);

		if (pokemon.ability === abilityID && pokemon.nature === natureID) {
			throw new Chat.ErrorMessage("Nothing changed on that Pokemon.");
		}

		pokemon.ability = abilityID;
		pokemon.nature = natureID;
		return `${trainer.name} successfully altered their ${pokemon.species.name}.`;
	}
}

class TCHiddenDojo extends TCFacility {
	name = "Hidden Dojo";

	doAction(trainer: TCTrainer, args: string[]) {
		const pokemon = trainer.requirePokemon(args);

		const ability = pokemon.species.abilities['H'];
		if (!ability) throw new Chat.ErrorMessage(`${pokemon.species.name} doesn't have a Hidden Ability`);

		pokemon.ability = ability;
		return `${trainer.name} successfully gave ${pokemon.species.name} its Hidden Ability.`;
	}
}

class TCPowerGym extends TCFacility {
	name = "Power Gym";

	// args := pokemon STAT_LIST STAT_LIST
	// STAT_LIST := hp|atk|def|spa|spd|spe

	doAction(trainer: TCTrainer, args: string[]) {
		const pokemon = trainer.requirePokemon(args);

		const evsList = args.shift()?.split('|');
		if (!evsList || evsList.length !== 6) throw new Chat.ErrorMessage(`Invalid EVs`);

		const parsedEVsList = evsList.map(val => parseInt(val));
		if (parsedEVsList.some(stat => isNaN(stat) || stat < 0 || stat > 252)) throw new Chat.ErrorMessage(`Invalid EVs`);

		let oldSum = Object.values(pokemon.evs).reduce((a, b) => a + b);
		let newSum = parsedEVsList.reduce((a, b) => a + b);
		if (oldSum !== newSum) throw new Chat.ErrorMessage(`Sum of EVs must remain ${oldSum}`);

		const ivsList = args.shift()?.split('|');
		if (!ivsList || ivsList.length !== 6) throw new Chat.ErrorMessage(`Invalid IVs`);

		const parsedIVsList = ivsList.map(val => parseInt(val));
		if (parsedIVsList.some(stat => isNaN(stat) || stat < 0 || stat > 31)) throw new Chat.ErrorMessage(`Invalid IVs`);

		oldSum = Object.values(pokemon.ivs).reduce((a, b) => a + b);
		newSum = parsedIVsList.reduce((a, b) => a + b);
		if (oldSum !== newSum) throw new Chat.ErrorMessage(`Sum of IVs must remain ${oldSum}`);

		pokemon.evs.hp = parsedEVsList[0];
		pokemon.evs.atk = parsedEVsList[1];
		pokemon.evs.def = parsedEVsList[2];
		pokemon.evs.spa = parsedEVsList[3];
		pokemon.evs.spd = parsedEVsList[4];
		pokemon.evs.spe = parsedEVsList[5];

		pokemon.ivs.hp = parsedIVsList[0];
		pokemon.ivs.atk = parsedIVsList[1];
		pokemon.ivs.def = parsedIVsList[2];
		pokemon.ivs.spa = parsedIVsList[3];
		pokemon.ivs.spd = parsedIVsList[4];
		pokemon.ivs.spe = parsedIVsList[5];

		return `${trainer.name}'s ${pokemon.species.name} had its stats redistributed.`;
	}
}

class TCWeaponsShop extends TCBaseItemShop {
	name = "Weapons Shop";
}

class TCRelicClass extends TCMoveTutor {
	name = "Relic Class";
}

class TCDayCare extends TCFacility {
	name = "Day Care";

	egg: TCPokemon | null;
	hatchTime: number;

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.egg = null;
		this.hatchTime = 0;
	}

	onNextMonth(): void {
		if (this.hatchTime > 0) this.hatchTime--;
	}

	doAction(trainer: TCTrainer, args: string[]) {
		switch (args.shift()) {
		case 'breed':
			const pokemon1 = trainer.requirePokemon(args);
			const pokemon2 = trainer.requirePokemon(args);
			// breed them
			return `${trainer.name}'s ${pokemon1.species.name} and ${pokemon2.species.name} had a baby! The egg will hatch after ${this.hatchTime} months.`;
		case 'takepokemon':
			if (!this.egg) throw new Chat.ErrorMessage(`There's no egg at the daycare.`);
			if (this.hatchTime > 0) throw new Chat.ErrorMessage(`The egg hasn't hatched yet.`);
			if (trainer.party.length >= trainer.maxPokemon) throw new Chat.ErrorMessage(`${trainer.name}'s party is full.`);
			const newPokemon = this.egg;
			this.egg = null;
			trainer.party.push(newPokemon);
			newPokemon.trainer = trainer;
			return `${trainer.name} took the hatched ${newPokemon.species.name}.`;
		default:
			throw new Chat.ErrorMessage("Invalid arguments for daycare");
		}
	}
}

class TCFestival extends TCFacility {
	name = "Festival";
}

class TCItemShop extends TCBaseItemShop {
	name = "Item Shop";
}

class TCHermitage extends TCFacility {
	name = "Trial";

	trainers: {trainer: TCTrainer, timeRemaining: number, targetRank: 2 | 3}[];

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.trainers = [];
	}

	onNextMonth(): void {
		for (const trainer of this.trainers) {
			trainer.timeRemaining--;
			if (trainer.timeRemaining <= 0) {
				// rank up the trainer
				// level up pokemon
				// add friendship values
				// add new items/moves
				// return the trainer
			}
		}
		this.trainers = this.trainers.filter(trainer => trainer.timeRemaining <= 0);
	}

	doAction(trainer: TCTrainer, args: string[]) {
		let trialTime: number, targetRank: 2 | 3;
		switch (trainer.rank) {
		case 1:
			trialTime = 5;
			targetRank = 2;
			break;
		case 2:
			trialTime = 12;
			targetRank = 3;
			break;
		case 3:
			throw new Chat.ErrorMessage(`${trainer.name} is already rank 3 and can't rank up further`);
		}
		this.trainers.push({trainer, timeRemaining: trialTime, targetRank});
		// mark trainer as unavailable
		return `${trainer.name} began a trial. They will return after ${trialTime} months.`;
	}
}

class TCRecruitmentCenter extends TCFacility {
	name = "Recruitment Center";
}

class TCRecon extends TCFacility {
	name = "Recon";
}

class TCShelter extends TCFacility {
	name = "Shelter";

	pokemon: string | null;

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.pokemon = null;
	}

	onNextMonth(): void {
		// possibly have a pokemon show up
	}

	doAction(trainer: TCTrainer, args: string[]) {
		if (!this.pokemon) throw new Chat.ErrorMessage(`There's no Pokemon at the shelter.`);
		if (trainer.party.length >= trainer.maxPokemon) throw new Chat.ErrorMessage(`${trainer.name}'s party is full.`);
		const newPokemon = this.pokemon;
		this.pokemon = null;
		trainer.party.push(new TCPokemon(trainer, newPokemon));
		return `${trainer.name} befriended the ${newPokemon}.`;
	}
}

class TCPark extends TCFacility {
	name = "Park";

	doAction(trainer: TCTrainer, args: string[]) {
		// if trainer is rank 1, have an extra arg that is a set of StatIDs separated by |
		switch (trainer.rank) {
		case 1: {
			const statList = args.shift()?.split('|').filter(x => !!x);
			if (!statList || statList.length !== 3 || statList.some(x => !['hp', 'atk', 'def', 'spa', 'spd', 'spe'].includes(x))) { throw new Chat.ErrorMessage("Invalid stats list. Must choose 3 stats to increase."); }
			for (const pokemon of trainer.party) {
				pokemon.tryIncrementFriendship(25);
				for (const stat of statList) {
					pokemon.tryIncrementIV(stat as StatID, 1);
				}
			}
			break;
		}
		case 2:
			for (const pokemon of trainer.party) {
				pokemon.tryIncrementFriendship(50);
				pokemon.incrementAllIVs();
			}
			break;
		case 3:
			for (const pokemon of trainer.party) {
				pokemon.tryIncrementFriendship(100);
				pokemon.incrementAllIVs(2);
			}
		}

		// Show dialog to learn new skill
	}
}

export const FACILITY_TABLE: {[k: string]: new (kingdom: TCKingdom) => TCFacility} = {
	'farmersmarket': TCFarmersMarket,
	'techniquetutor': TCTechniqueTutor,
	'bonusshrine': TCBonusShrine,
	'tradecenter': TCTradeCenter,
	'communications': TCCommunications,
	'tomb': TCTomb,
	'mysticforest': TCMysticForest,
	'hiddendojo': TCHiddenDojo,
	'powergym': TCPowerGym,
	'weaponsshop': TCWeaponsShop,
	'relicclass': TCRelicClass,
	'daycare': TCDayCare,
	'festival': TCFestival,
	'itemshop': TCItemShop,
	'hermitage': TCHermitage,
	'recruitmentcenter': TCRecruitmentCenter,
	'recon': TCRecon,
	'shelter': TCShelter,
	'park': TCPark,
};

