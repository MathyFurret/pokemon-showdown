import { ModdedDex } from "../../../sim/dex";
import { TCKingdom, TCTrainer } from "./game-objects";
import { TrainerConquestPlayer } from "./player";

export class TrainerConquest extends Rooms.RoomGame {
	readonly dex: ModdedDex = Dex;
	players: TrainerConquestPlayer[];
	kingdoms: TCKingdom[];
	turn: number;

	constructor(room: ChatRoom) {
		super(room);
		this.players = [];
		this.kingdoms = [];
		this.turn = 0;
	}

	createBattle(trainer1: TCTrainer, trainer2: TCTrainer) {
		let format = "gen8customgame";

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
	}
}