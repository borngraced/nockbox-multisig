import { useState } from "react";
import {
	Plus,
	Trash2,
	Users,
	Shield,
	ChevronDown,
	ChevronUp,
	Wallet,
	AlertCircle,
	Copy,
	Check,
} from "lucide-react";
import { Button, Input } from "@/shared/components";
import { cn } from "@/shared/lib/cn";
import { useWalletStore, type MultisigAccount } from "./wallet-store";
import { isValidPkh } from "@/features/transaction/build-transaction";

export function MultisigAccountManager() {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [newThreshold, setNewThreshold] = useState(2);
	const [newSigners, setNewSigners] = useState<string[]>(["", ""]);
	const [error, setError] = useState<string | null>(null);
	const [copiedHash, setCopiedHash] = useState<string | null>(null);

	const handleCopyAddress = async (lockHash: string, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			await navigator.clipboard.writeText(lockHash);
			setCopiedHash(lockHash);
			setTimeout(() => setCopiedHash(null), 2000);
		} catch {
			// Fallback for older browsers
			const textArea = document.createElement("textarea");
			textArea.value = lockHash;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand("copy");
			document.body.removeChild(textArea);
			setCopiedHash(lockHash);
			setTimeout(() => setCopiedHash(null), 2000);
		}
	};

	const {
		connection,
		activeMultisig,
		savedMultisigs,
		createMultisigAccount,
		setActiveMultisig,
		removeMultisigAccount,
	} = useWalletStore();

	const isConnected = !!connection;

	const handleAddSigner = () => {
		setNewSigners([...newSigners, ""]);
	};

	const handleRemoveSigner = (index: number) => {
		if (newSigners.length <= 2) return;
		setNewSigners(newSigners.filter((_, i) => i !== index));
	};

	const handleSignerChange = (index: number, value: string) => {
		const updated = [...newSigners];
		updated[index] = value;
		setNewSigners(updated);
	};

	const handleCreate = async () => {
		setError(null);

		if (!newName.trim()) {
			setError("Please enter a name for the multisig account");
			return;
		}

		const validSigners = newSigners.filter((s) => s.trim());
		if (validSigners.length < 2) {
			setError("At least 2 signers are required");
			return;
		}

		for (const signer of validSigners) {
			if (!isValidPkh(signer)) {
				setError(`Invalid PKH format: ${signer.slice(0, 20)}...`);
				return;
			}
		}

		const normalizedSigners = validSigners.map((s) => s.toLowerCase().trim());
		const uniqueSigners = new Set(normalizedSigners);
		if (uniqueSigners.size !== normalizedSigners.length) {
			setError("Duplicate signer addresses are not allowed");
			return;
		}

		if (newThreshold < 1 || newThreshold > validSigners.length) {
			setError(`Threshold must be between 1 and ${validSigners.length}`);
			return;
		}

		const multisig = createMultisigAccount(
			newName.trim(),
			newThreshold,
			validSigners,
		);
		await setActiveMultisig(multisig);

		setNewName("");
		setNewThreshold(2);
		setNewSigners(["", ""]);
		setIsCreating(false);
	};

	const handleSelectMultisig = async (multisig: MultisigAccount) => {
		await setActiveMultisig(multisig);
	};

	const handleBackToPersonal = async () => {
		await setActiveMultisig(null);
	};

	if (!isConnected) {
		return null;
	}

	return (
		<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center justify-between w-full p-4 text-left hover:bg-tertiary transition-colors"
			>
				<div className="flex items-center gap-2">
					<Shield className="h-4 w-4 text-accent" />
					<span className="font-medium text-sm">Multisig Accounts</span>
					{activeMultisig && (
						<span className="badge badge-accent text-xs">
							{activeMultisig.name}
						</span>
					)}
				</div>
				{isExpanded ? (
					<ChevronUp className="h-4 w-4 text-muted" />
				) : (
					<ChevronDown className="h-4 w-4 text-muted" />
				)}
			</button>

			{isExpanded && (
				<div className="p-4 pt-0 space-y-4 animate-fade-in">
					<div className="p-3 rounded-lg bg-tertiary">
						<p className="text-xs text-muted mb-1">Currently Viewing</p>
						{activeMultisig ? (
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Users className="h-4 w-4 text-accent" />
									<span className="font-medium text-sm">
										{activeMultisig.name}
									</span>
									<span className="text-xs text-muted">
										{activeMultisig.threshold}-of-
										{activeMultisig.signerPkhs.length}
									</span>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleBackToPersonal}
								>
									<Wallet className="h-4 w-4 mr-1" />
									Personal
								</Button>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<Wallet className="h-4 w-4 text-accent" />
								<span className="font-medium text-sm">Personal Wallet</span>
							</div>
						)}
					</div>

					{savedMultisigs.length > 0 && !isCreating && (
						<div className="space-y-2">
							<p className="text-xs text-muted">Saved Accounts</p>
							{savedMultisigs.map((multisig) => (
								<div
									key={multisig.lockHash}
									className={cn(
										"flex items-center justify-between p-3 rounded-lg transition-all duration-200",
										activeMultisig?.lockHash === multisig.lockHash
											? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]"
											: "bg-tertiary hover:bg-elevated cursor-pointer",
									)}
									onClick={() =>
										activeMultisig?.lockHash !== multisig.lockHash &&
										handleSelectMultisig(multisig)
									}
								>
									<div>
										<p className="font-medium text-sm">{multisig.name}</p>
										<p className="text-xs text-muted font-mono">
											{multisig.lockHash.slice(0, 12)}...
										</p>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-xs text-muted">
											{multisig.threshold}-of-{multisig.signerPkhs.length}
										</span>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-muted hover:text-[var(--color-accent)]"
											onClick={(e) => handleCopyAddress(multisig.lockHash, e)}
											title="Copy address"
										>
											{copiedHash === multisig.lockHash ? (
												<Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
											) : (
												<Copy className="h-3.5 w-3.5" />
											)}
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-muted hover:text-[var(--color-error)]"
											onClick={async (e) => {
												e.stopPropagation();
												await removeMultisigAccount(multisig.lockHash);
											}}
											title="Delete account"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}

					{isCreating ? (
						<div className="space-y-4 p-4 rounded-lg bg-tertiary animate-fade-in">
							<div className="flex items-center justify-between">
								<p className="font-medium text-sm">New Multisig Account</p>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setIsCreating(false)}
								>
									Cancel
								</Button>
							</div>

							{error && (
								<div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-error)]/10 text-[var(--color-error)]">
									<AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
									<p className="text-sm">{error}</p>
								</div>
							)}

							<Input
								label="Account Name"
								placeholder="e.g., Treasury, Team Funds"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
							/>

							<div>
								<label className="block text-sm font-medium mb-2">
									Threshold: {newThreshold} of{" "}
									{newSigners.filter((s) => s.trim()).length ||
										newSigners.length}
								</label>
								<input
									type="range"
									min={1}
									max={Math.max(newSigners.length, 2)}
									value={newThreshold}
									onChange={(e) => setNewThreshold(Number(e.target.value))}
									className="w-full accent-[var(--color-accent)]"
								/>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<label className="text-sm font-medium">Signers</label>
									<Button variant="ghost" size="sm" onClick={handleAddSigner}>
										<Plus className="h-3.5 w-3.5 mr-1" />
										Add
									</Button>
								</div>
								{newSigners.map((signer, index) => {
								const isDuplicate =
									signer.trim() &&
									newSigners.some(
										(s, i) =>
											i !== index &&
											s.trim() &&
											s.toLowerCase().trim() === signer.toLowerCase().trim()
									);
								return (
									<div key={index} className="space-y-1">
										<div className="flex items-center gap-2">
											<Input
												placeholder={`Signer ${index + 1} PKH`}
												value={signer}
												onChange={(e) => handleSignerChange(index, e.target.value)}
												className="flex-1 font-mono text-xs"
											/>
											{newSigners.length > 2 && (
												<Button
													variant="ghost"
													size="icon"
													className="h-9 w-9 text-muted hover:text-[var(--color-error)]"
													onClick={() => handleRemoveSigner(index)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>
										{isDuplicate && (
											<div className="flex items-center gap-1 text-xs text-[var(--color-warning)]">
												<AlertCircle className="h-3 w-3" />
												Duplicate address
											</div>
										)}
									</div>
								);
							})}
							</div>

							<Button onClick={handleCreate} className="w-full">
								Create Multisig Account
							</Button>
						</div>
					) : (
						<Button
							variant="secondary"
							onClick={() => setIsCreating(true)}
							className="w-full gap-2"
						>
							<Plus className="h-4 w-4" />
							Create Multisig Account
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
