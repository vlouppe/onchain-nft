import {
  changeCallStack,
  resetStorage,
  setDeployContext,
  mockTransferredCoins,
} from '@massalabs/massa-as-sdk';
import { Args, bytesToU256 } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly';
import {
  balanceOf,
  constructor,
  mint,
  name,
  ownerOf,
  symbol,
  tokenURI,
} from '../contracts/main';
import { bytesToString } from '@massalabs/as-types/assembly/serialization/strings';
import { ownerAddress } from '@massalabs/sc-standards/assembly/contracts/NFT/NFT-example';
import {mockBalance} from "@massalabs/massa-as-sdk/assembly/vm-mock/env";

const NFTName = 'MASSA_NFT';
const NFTSymbol = 'NFT';
const contractOwner = 'A12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq';
const tokenAddress = 'AS12BqZEQ6sByhRLyEuf0YbQmcF2PsDdkNNG1akBJu9XcjZA1eT';
const from = 'AU12CzoKEASaeBHnxGLnHDG2u73dLzWWfgvW6bc4L1UfMA5Uc5Fg7';
const to = 'AU178qZCfaNXkz9tQiXJcVfAEnYGJ27UoNtFFJh3BiT8jTfY8P2D';
const zeroAddress = '';
const tokenId = u256.One;

function switchUser(user: string): void {
  changeCallStack(user + ' , ' + tokenAddress);
}

beforeEach(() => {
  resetStorage();
  setDeployContext(contractOwner);
  constructor(new Args().add(NFTName).add(NFTSymbol).serialize());
  switchUser(contractOwner);
  mockBalance(contractOwner, 1_000_000_000);
});

describe('Initialization', () => {
  test('get name', () => {
    expect(bytesToString(name())).toStrictEqual(NFTName);
  });
  test('get symbol', () => {
    expect(bytesToString(symbol())).toStrictEqual(NFTSymbol);
  });
  test('get owner', () => {
    expect(bytesToString(ownerAddress([]))).toStrictEqual(contractOwner);
  });
});

describe('Minting', () => {
  test('Mint token to an address', () => {
    mockTransferredCoins(1_000_000_000);
    switchUser(to);
    mint(new Args().add(tokenId).serialize());
    expect(bytesToString(ownerOf(new Args().add(tokenId).serialize()))).toBe(
      to,
    );
    expect(
      bytesToU256(balanceOf(new Args().add(to).serialize())),
    ).toStrictEqual(u256.One);
  });
  throws('Minting without enough transferred coins should fail', () => {
    mockTransferredCoins(100_000_000);
    switchUser(to);
    mint(new Args().add(tokenId).serialize());
  });
  throws('Minting to zero address should fail', () => {
    mockTransferredCoins(1_000_000_000);
    switchUser(zeroAddress);
    mint(new Args().add(tokenId).serialize());
  });
  throws('Minting an already existing tokenId should fail', () => {
    mockTransferredCoins(1_000_000_000);
    switchUser(to);
    mint(new Args().add(tokenId).serialize());
    mint(new Args().add(tokenId).serialize());
  });
  test('Mint multiple tokens to an address', () => {
    mockTransferredCoins(1_000_000_000);
    switchUser(to);
    mint(new Args().add(u256.fromU64(5)).serialize());
    mint(new Args().add(u256.fromU64(6)).serialize());
    expect(
      bytesToU256(balanceOf(new Args().add(to).serialize())),
    ).toStrictEqual(new u256(2));
  });
  test('Mint multiple tokens to different addresses', () => {
    mockTransferredCoins(1_000_000_000);
    switchUser(to);
    mint(new Args().add(tokenId).serialize());
    switchUser(from);
    mint(new Args().add(new u256(2)).serialize());
    expect(
      bytesToU256(balanceOf(new Args().add(to).serialize())),
    ).toStrictEqual(u256.One);
    expect(
      bytesToString(ownerOf(new Args().add(new u256(2)).serialize())),
    ).toBe(from);
    expect(
      bytesToU256(balanceOf(new Args().add(from).serialize())),
    ).toStrictEqual(u256.One);
    expect(bytesToString(ownerOf(new Args().add(tokenId).serialize()))).toBe(
      to,
    );
  });
});

describe('Playing with data', () => {
  test('tokenURI of minted token 1', () => {
    mockTransferredCoins(1_000_000_000);
    mint(new Args().add(tokenId).serialize());
    expect(
      bytesToString(tokenURI(new Args().add(tokenId).serialize())),
    ).toStrictEqual(
      'data:application/json;base64,eyJuYW1lIjoiVG9rZW4gIzEiLCJkZXNjcmlwdGlvbiI6IlRoZSBvd25lciBvZiB0aGlzIE5GVCBoYXZlIGNlcnRhaW4gY2FwYWJpbGl0aWVzIC4uLiIsImltYWdlIjoiZGF0YTppbWFnZS9zdmcreG1sO2Jhc2U2NCxQSE4yWnlCNGJXeHVjejBpYUhSMGNEb3ZMM2QzZHk1M015NXZjbWN2TWpBd01DOXpkbWNpSUhacFpYZENiM2c5SWpBZ01DQTFNVElnTlRFeUlqNDhjbVZqZENCb1pXbG5hSFE5SWpVd01DSWdkMmxrZEdnOUlqVXdNQ0lnWm1sc2JEMGlJekUzUWtWQ1FpSStQQzl5WldOMFBqeDBaWGgwSUdadmJuUXRjMmw2WlQwaU16QWlJR1pwYkd3OUlpTXlSVEk0TWtFaUlHWnZiblF0Wm1GdGFXeDVQU0pXWlhKa1lXNWhJaUIwWlhoMExXRnVZMmh2Y2owaWJXbGtaR3hsSWlCaGJHbG5ibTFsYm5RdFltRnpaV3hwYm1VOUltSmhjMlZzYVc1bElpQjRQU0l5TURBaUlIazlJakkxTUNJK0l6RThMM1JsZUhRK1BDOXpkbWMrIn0=',
    );
  });
  test('tokenURI of a not minted token', () => {
    mockTransferredCoins(1_000_000_000);
    mint(new Args().add(tokenId).serialize());
    expect(
      bytesToString(tokenURI(new Args().add(new u256(2)).serialize())),
    ).toStrictEqual(
      'data:application/json;base64,eyJuYW1lIjoiVG9rZW4gIzIgKG5vdCBtaW50ZWQpIiwiZGVzY3JpcHRpb24iOiJPd25lcnNoaXAgb2YgdGhpcyBORlQgd2lsbCBncmFudHMgY2VydGFpbiBjYXBhYmlsaXRpZXMgLi4uIiwiaW1hZ2UiOiJkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LFBITjJaeUI0Yld4dWN6MGlhSFIwY0RvdkwzZDNkeTUzTXk1dmNtY3ZNakF3TUM5emRtY2lJSFpwWlhkQ2IzZzlJakFnTUNBMU1USWdOVEV5SWo0OGNtVmpkQ0JvWldsbmFIUTlJalV3TUNJZ2QybGtkR2c5SWpVd01DSWdabWxzYkQwaUkwUkVSRVJFUkNJK1BDOXlaV04wUGp4MFpYaDBJR1p2Ym5RdGMybDZaVDBpTXpBaUlHWnBiR3c5SWlNd01EQXdNREFpSUdadmJuUXRabUZ0YVd4NVBTSldaWEprWVc1aElpQjBaWGgwTFdGdVkyaHZjajBpYldsa1pHeGxJaUJoYkdsbmJtMWxiblF0WW1GelpXeHBibVU5SW1KaGMyVnNhVzVsSWlCNFBTSXlNakFpSUhrOUlqSTFNQ0krSXpJZ0x5Qk9UMVFnVFVsT1ZFVkVQQzkwWlhoMFBqd3ZjM1puUGc9PSJ9',
    );
  });
});
