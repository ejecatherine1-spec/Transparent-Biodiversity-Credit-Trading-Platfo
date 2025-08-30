import { describe, expect, it, vi, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface MintRecord {
  amount: number;
  recipient: string;
  projectHash: string;
  metadata: string;
  timestamp: number;
}

interface ContractState {
  balances: Map<string, number>;
  minters: Map<string, boolean>;
  mintRecords: Map<number, MintRecord>;
  totalSupply: number;
  paused: boolean;
  admin: string;
  mintCounter: number;
}

// Mock contract implementation
class CreditRegistryMock {
  private state: ContractState = {
    balances: new Map(),
    minters: new Map([["deployer", true]]),
    mintRecords: new Map(),
    totalSupply: 0,
    paused: false,
    admin: "deployer",
    mintCounter: 0,
  };

  private MAX_METADATA_LEN = 500;
  private ERR_UNAUTHORIZED = 100;
  private ERR_PAUSED = 101;
  private ERR_INVALID_AMOUNT = 102;
  private ERR_INVALID_RECIPIENT = 103;
  private ERR_INVALID_MINTER = 104;
  private ERR_ALREADY_REGISTERED = 105;
  private ERR_METADATA_TOO_LONG = 106;
  private ERR_INVALID_PROJECT_HASH = 107;
  private ERR_INSUFFICIENT_BALANCE = 108;
  private ERR_TRANSFER_PAUSED = 109;
  private ERR_BURN_PAUSED = 110;

  getName(): ClarityResponse<string> {
    return { ok: true, value: "BiodiversityCredit" };
  }

  getSymbol(): ClarityResponse<string> {
    return { ok: true, value: "BDC" };
  }

  getDecimals(): ClarityResponse<number> {
    return { ok: true, value: 0 };
  }

  getTotalSupply(): ClarityResponse<number> {
    return { ok: true, value: this.state.totalSupply };
  }

  getBalance(account: string): ClarityResponse<number> {
    return { ok: true, value: this.state.balances.get(account) ?? 0 };
  }

  getMintRecord(mintId: number): ClarityResponse<MintRecord | null> {
    return { ok: true, value: this.state.mintRecords.get(mintId) ?? null };
  }

  isMinter(account: string): ClarityResponse<boolean> {
    return { ok: true, value: this.state.minters.get(account) ?? false };
  }

  isPaused(): ClarityResponse<boolean> {
    return { ok: true, value: this.state.paused };
  }

  getAdmin(): ClarityResponse<string> {
    return { ok: true, value: this.state.admin };
  }

  getMintCounter(): ClarityResponse<number> {
    return { ok: true, value: this.state.mintCounter };
  }

  setAdmin(caller: string, newAdmin: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.admin = newAdmin;
    return { ok: true, value: true };
  }

  pauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = true;
    return { ok: true, value: true };
  }

  unpauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = false;
    return { ok: true, value: true };
  }

  addMinter(caller: string, minter: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (this.state.minters.has(minter)) {
      return { ok: false, value: this.ERR_ALREADY_REGISTERED };
    }
    this.state.minters.set(minter, true);
    return { ok: true, value: true };
  }

  removeMinter(caller: string, minter: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.minters.set(minter, false);
    return { ok: true, value: true };
  }

  mint(caller: string, amount: number, recipient: string, projectHash: string, metadata: string): ClarityResponse<number> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    if (!this.state.minters.get(caller)) {
      return { ok: false, value: this.ERR_INVALID_MINTER };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    if (recipient === "deployer") { // Assuming invalid for test
      return { ok: false, value: this.ERR_INVALID_RECIPIENT };
    }
    if (metadata.length > this.MAX_METADATA_LEN) {
      return { ok: false, value: this.ERR_METADATA_TOO_LONG };
    }
    if (projectHash.length !== 64) { // Hex buff 32
      return { ok: false, value: this.ERR_INVALID_PROJECT_HASH };
    }
    const currentBalance = this.state.balances.get(recipient) ?? 0;
    this.state.balances.set(recipient, currentBalance + amount);
    this.state.totalSupply += amount;
    const mintId = this.state.mintCounter + 1;
    this.state.mintRecords.set(mintId, {
      amount,
      recipient,
      projectHash,
      metadata,
      timestamp: Date.now(),
    });
    this.state.mintCounter = mintId;
    return { ok: true, value: mintId };
  }

  transfer(caller: string, amount: number, sender: string, recipient: string): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_TRANSFER_PAUSED };
    }
    if (caller !== sender) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    if (recipient === "deployer") {
      return { ok: false, value: this.ERR_INVALID_RECIPIENT };
    }
    const senderBalance = this.state.balances.get(sender) ?? 0;
    if (senderBalance < amount) {
      return { ok: false, value: this.ERR_INSUFFICIENT_BALANCE };
    }
    this.state.balances.set(sender, senderBalance - amount);
    const recipientBalance = this.state.balances.get(recipient) ?? 0;
    this.state.balances.set(recipient, recipientBalance + amount);
    return { ok: true, value: true };
  }

  burn(caller: string, amount: number): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_BURN_PAUSED };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    const senderBalance = this.state.balances.get(caller) ?? 0;
    if (senderBalance < amount) {
      return { ok: false, value: this.ERR_INSUFFICIENT_BALANCE };
    }
    this.state.balances.set(caller, senderBalance - amount);
    this.state.totalSupply -= amount;
    return { ok: true, value: true };
  }
}

// Test setup
const accounts = {
  deployer: "deployer",
  minter: "wallet_1",
  user1: "wallet_2",
  user2: "wallet_3",
};

const dummyProjectHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 chars hex

describe("CreditRegistry Contract", () => {
  let contract: CreditRegistryMock;

  beforeEach(() => {
    contract = new CreditRegistryMock();
    vi.resetAllMocks();
  });

  it("should initialize with correct token metadata", () => {
    expect(contract.getName()).toEqual({ ok: true, value: "BiodiversityCredit" });
    expect(contract.getSymbol()).toEqual({ ok: true, value: "BDC" });
    expect(contract.getDecimals()).toEqual({ ok: true, value: 0 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 0 });
  });

  it("should allow admin to add minter", () => {
    const addMinter = contract.addMinter(accounts.deployer, accounts.minter);
    expect(addMinter).toEqual({ ok: true, value: true });

    const isMinter = contract.isMinter(accounts.minter);
    expect(isMinter).toEqual({ ok: true, value: true });
  });

  it("should prevent non-admin from adding minter", () => {
    const addMinter = contract.addMinter(accounts.user1, accounts.user2);
    expect(addMinter).toEqual({ ok: false, value: 100 });
  });

  it("should allow minter to mint credits with metadata and project hash", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    
    const mintResult = contract.mint(
      accounts.minter,
      1000,
      accounts.user1,
      dummyProjectHash,
      "Restoration Project XYZ"
    );
    expect(mintResult).toEqual({ ok: true, value: 1 });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 1000 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 1000 });

    const mintRecord = contract.getMintRecord(1);
    expect(mintRecord).toEqual({
      ok: true,
      value: expect.objectContaining({
        amount: 1000,
        recipient: accounts.user1,
        projectHash: dummyProjectHash,
        metadata: "Restoration Project XYZ",
      }),
    });
  });

  it("should prevent non-minter from minting", () => {
    const mintResult = contract.mint(
      accounts.user1,
      1000,
      accounts.user1,
      dummyProjectHash,
      "Unauthorized mint"
    );
    expect(mintResult).toEqual({ ok: false, value: 104 });
  });

  it("should prevent mint with invalid project hash", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    
    const mintResult = contract.mint(
      accounts.minter,
      1000,
      accounts.user1,
      "invalidhash",
      "Test"
    );
    expect(mintResult).toEqual({ ok: false, value: 107 });
  });

  it("should allow credit transfer between users", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 1000, accounts.user1, dummyProjectHash, "Test mint");

    const transferResult = contract.transfer(
      accounts.user1,
      500,
      accounts.user1,
      accounts.user2
    );
    expect(transferResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 500 });
    expect(contract.getBalance(accounts.user2)).toEqual({ ok: true, value: 500 });
  });

  it("should prevent transfer of insufficient balance", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 100, accounts.user1, dummyProjectHash, "Test mint");

    const transferResult = contract.transfer(
      accounts.user1,
      200,
      accounts.user1,
      accounts.user2
    );
    expect(transferResult).toEqual({ ok: false, value: 108 });
  });

  it("should allow burning credits", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 1000, accounts.user1, dummyProjectHash, "Test mint");

    const burnResult = contract.burn(accounts.user1, 300);
    expect(burnResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 700 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 700 });
  });

  it("should pause and unpause contract", () => {
    const pauseResult = contract.pauseContract(accounts.deployer);
    expect(pauseResult).toEqual({ ok: true, value: true });
    expect(contract.isPaused()).toEqual({ ok: true, value: true });

    const mintDuringPause = contract.mint(
      accounts.deployer,
      1000,
      accounts.user1,
      dummyProjectHash,
      "Paused mint"
    );
    expect(mintDuringPause).toEqual({ ok: false, value: 101 });

    const unpauseResult = contract.unpauseContract(accounts.deployer);
    expect(unpauseResult).toEqual({ ok: true, value: true });
    expect(contract.isPaused()).toEqual({ ok: true, value: false });
  });

  it("should prevent metadata exceeding max length", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    
    const longMetadata = "a".repeat(501);
    const mintResult = contract.mint(
      accounts.minter,
      1000,
      accounts.user1,
      dummyProjectHash,
      longMetadata
    );
    expect(mintResult).toEqual({ ok: false, value: 106 });
  });

  it("should allow admin to change admin", () => {
    const setAdminResult = contract.setAdmin(accounts.deployer, accounts.user1);
    expect(setAdminResult).toEqual({ ok: true, value: true });
    expect(contract.getAdmin()).toEqual({ ok: true, value: accounts.user1 });
  });

  it("should prevent non-admin from changing admin", () => {
    const setAdminResult = contract.setAdmin(accounts.user2, accounts.user1);
    expect(setAdminResult).toEqual({ ok: false, value: 100 });
  });
});