import { create } from "zustand";
import { wasm } from "@/shared/lib";
import { type Digest, type TransactionInput, createEmptyDraft } from "@/shared/types";
import type { ConnectionInfo, WalletError } from "./types";
import { getWalletService } from "./wallet-service";
import { useTransactionStore } from "@/shared/hooks/transaction-store";

const TEST_PKH =
	"6psXufjYNRxffRx72w8FF9b5MYg8TEmWq2nEFkqYm51yfqsnkJu8XqX" as const;

export interface NoteDisplayData {
	nameFirst: string;
	nameLast: string;
	assets: bigint;
	originPage: bigint;
}

export interface WalletNote {
	noteProtobuf: Uint8Array;
	spendConditionProtobuf: Uint8Array;
	noteHash: string;
	display: NoteDisplayData;
}

export function getNote(wn: WalletNote): InstanceType<typeof wasm.Note> {
	return wasm.Note.fromProtobuf(wn.noteProtobuf);
}

export function getNoteHash(wn: WalletNote): InstanceType<typeof wasm.Digest> {
	return new wasm.Digest(wn.noteHash);
}

export function getSpendCondition(
	wn: WalletNote,
): InstanceType<typeof wasm.SpendCondition> {
	return wasm.SpendCondition.fromProtobuf(wn.spendConditionProtobuf);
}
export function toTransactionInput(
	wn: WalletNote,
	selected = false,
): TransactionInput {
	return {
		nameFirst: wn.display.nameFirst,
		nameLast: wn.display.nameLast,
		assets: wn.display.assets,
		originPage: wn.display.originPage,
		selected,
	};
}

export function computeMultisigLockHash(
	threshold: number,
	signerPkhs: string[],
): string {
	const pkh = new wasm.Pkh(BigInt(threshold), signerPkhs);
	const spendCondition = wasm.SpendCondition.newPkh(pkh);
	return spendCondition.firstName().value;
}

export function createMultisigSpendCondition(
	threshold: number,
	signerPkhs: string[],
): Uint8Array {
	const pkh = new wasm.Pkh(BigInt(threshold), signerPkhs);
	const spendCondition = wasm.SpendCondition.newPkh(pkh);
	return spendCondition.toProtobuf();
}

function createTestNotes(): WalletNote[] {
	const spendCondition = wasm.SpendCondition.newPkh(wasm.Pkh.single(TEST_PKH));
	const firstName = spendCondition.firstName().value;

	const createNoteWithCondition = (
		lastName: string,
		assets: bigint,
	): WalletNote => {
		const name = new wasm.Name(firstName, lastName);
		const noteData = wasm.NoteData.empty();
		const note = new wasm.Note(wasm.Version.V1(), 0n, name, noteData, assets);

		const display: NoteDisplayData = {
			nameFirst: note.name.first,
			nameLast: note.name.last,
			assets: note.assets,
			originPage: note.originPage,
		};

		return {
			noteProtobuf: note.toProtobuf(),
			spendConditionProtobuf: spendCondition.toProtobuf(),
			noteHash: note.hash().value,
			display,
		};
	};

	return [
		createNoteWithCondition(
			"7ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123",
			65536000n,
		),
		createNoteWithCondition(
			"8BCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz1234",
			32768000n,
		),
		createNoteWithCondition(
			"9CDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz12345",
			16384000n,
		),
	];
}

interface WalletStore {
	status: "disconnected" | "connecting" | "connected" | "error";
	connection: ConnectionInfo | null;
	notes: WalletNote[];
	error: WalletError | null;
	isTestMode: boolean;

	connect: () => Promise<void>;
	disconnect: () => void;
	fetchNotes: (lockDigest: Digest) => Promise<void>;
	clearError: () => void;
	useTestMode: () => void;
}

export const useWalletStore = create<WalletStore>()((set, get) => ({
	status: "disconnected",
	connection: null,
	notes: [],
	error: null,
	isTestMode: false,

	connect: async () => {
		if (get().status === "connecting") return;

		set({ status: "connecting", error: null });

		const service = getWalletService();
		const result = await service.connect();

		if (result.ok) {
			set({
				status: "connected",
				connection: result.value,
				error: null,
			});

			get().fetchNotes(result.value.pkh);
		} else {
			set({
				status: "error",
				error: result.error,
			});
		}
	},

	disconnect: () => {
		const service = getWalletService();
		service.disconnect();

		set({
			status: "disconnected",
			connection: null,
			notes: [],
			error: null,
			isTestMode: false,
		});

		useTransactionStore.setState({
			step: "inputs",
			draft: createEmptyDraft(),
			pendingTransactions: [],
			error: null,
			buildError: null,
			isBuilding: false,
		});
	},

	fetchNotes: async (lockDigest: Digest) => {
		const service = getWalletService();
		const result = await service.fetchNotes(lockDigest);

		if (result.ok) {
			set({ notes: result.value });
		}
	},

	clearError: () => set({ error: null }),

	useTestMode: () => {
		const testNotes = createTestNotes();
		set({
			status: "connected",
			connection: {
				pkh: TEST_PKH as Digest,
				grpcEndpoint: "http://localhost:50051",
			},
			notes: testNotes,
			error: null,
			isTestMode: true,
		});
	},
}));
