import {
  Args,
  boolToByte,
  stringToBytes,
  u256ToBytes,
} from '@massalabs/as-types';
import {
  _approve,
  _balanceOf,
  _constructor,
  _getApproved,
  _isApprovedForAll,
  _name,
  _ownerOf,
  _setApprovalForAll,
  _symbol,
  _update,
  _transferFrom, OWNER_KEY_PREFIX,
} from '@massalabs/sc-standards/assembly/contracts/NFT/NFT-internals';
import {
  setOwner,
  onlyOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

import {
  Context,
  isDeployingContract,
} from '@massalabs/massa-as-sdk/assembly/std';
import { JSON } from 'json-as/assembly';
import { encode } from './as-base64';
import {generateEvent, Storage} from '@massalabs/massa-as-sdk';
import { setBytecodeOf } from "@massalabs/massa-as-sdk/assembly/std/contract";
import { u256 } from 'as-bignum/assembly';

const MINT_PRICE: u64 = 1_000_000_000;
const MAX_MINT_PRICE: u64 = 1_100_000_000;
const TOTAL_SUPPLY = u256.fromU64(42);

@json
class ERC721Metadata {
  name!: string;
  description!: string;
  image!: string;
}

/**
 * @param binaryArgs - serialized strings representing the name and the symbol of the NFT
 *
 * @remarks This is the constructor of the contract. It can only be called once, when the contract is being deployed.
 * It expects two serialized arguments: the name and the symbol of the NFT.
 * Once the constructor has handled the deserialization, of the arguments,
 * it calls the _constructor function from the NFT-internals.
 *
 * Finally, it sets the owner of the contract to the caller of the constructor.
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  assert(isDeployingContract());
  const args = new Args(binaryArgs);
  const name = args.nextString().expect('name argument is missing or invalid');
  const symbol = args
    .nextString()
    .expect('symbol argument is missing or invalid');
  _constructor(name, symbol);
  setOwner(new Args().add(Context.caller().toString()).serialize());
}

export function name(): StaticArray<u8> {
  return stringToBytes(_name());
}

export function symbol(): StaticArray<u8> {
  return stringToBytes(_symbol());
}

/**
 *
 * @param binaryArgs - serialized string representing the address whose balance we want to check
 * @returns a serialized u256 representing the balance of the address
 * @remarks As we can see, instead of checking the storage directly,
 * we call the _balanceOf function from the NFT-internals.
 */
export function balanceOf(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const address = args
    .nextString()
    .expect('address argument is missing or invalid');
  return u256ToBytes(_balanceOf(address));
}

function ownerKey(tokenId: u256): StaticArray<u8> {
  return OWNER_KEY_PREFIX.concat(u256ToBytes(tokenId));
}

/**
 *
 * @param binaryArgs - serialized u256 representing the tokenId whose owner we want to check
 * @returns a serialized string representing the address of owner of the tokenId
 */
export function ownerOf(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');
  return stringToBytes(_ownerOf(tokenId));
}

/**
 *
 * @param binaryArgs - serialized u256 representing the tokenId whose approved address we want to check
 * @returns a serialized string representing the address of the approved address of the tokenId
 */
export function getApproved(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');
  return stringToBytes(_getApproved(tokenId));
}

/**
 *
 * @param binaryArgs - serialized strings representing the address of an owner and an operator
 * @returns a serialized u8 representing a boolean value indicating if
 * the operator is approved for all the owner's tokens
 */
export function isApprovedForAll(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const owner = args
    .nextString()
    .expect('owner argument is missing or invalid');
  const operator = args
    .nextString()
    .expect('operator argument is missing or invalid');
  return boolToByte(_isApprovedForAll(owner, operator));
}

/**
 *
 * @param binaryArgs - serialized strings representing the address of the recipient and the tokenId to approve
 * @remarks This function is only callable by the owner of the tokenId or an approved operator.
 * Indeed, this will be checked by the _approve function of the NFT-internals.
 *
 */
export function approve(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const to = args.nextString().expect('to argument is missing or invalid');
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');
  _approve(to, tokenId);
}

/**
 *
 * @param binaryArgs - serialized arguments representing the address of the operator and a boolean value indicating
 * if the operator should be approved for all the caller's tokens
 *
 */
export function setApprovalForAll(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const to = args.nextString().expect('to argument is missing or invalid');
  const approved = args
    .nextBool()
    .expect('approved argument is missing or invalid');
  _setApprovalForAll(to, approved);
}

/**
 *
 * @param binaryArgs - serialized arguments representing the address of the sender,
 * the address of the recipient and the tokenId to transfer.
 *
 * @remarks This function is only callable by the owner of the tokenId or an approved operator.
 *
 */
export function transferFrom(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const from = args.nextString().expect('from argument is missing or invalid');
  const to = args.nextString().expect('to argument is missing or invalid');
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');
  _transferFrom(from, to, tokenId);
}

/**
 *
 * @param binaryArgs - serialized arguments representing the address of the recipient and the tokenId to mint
 *
 * Anybody can use the mint function if they send enough coins
 *
 * Here we make use of the _update function from the NFT-internals to mint a new token.
 * Indeed, by calling _update with a non-existing tokenId, we are creating a new token.
 *
 */
export function mint(binaryArgs: StaticArray<u8>): void {
  const amount = Context.transferredCoins();
  generateEvent('Trying to mint with an amount of ' + amount.toString());

  assert(amount >= MINT_PRICE, 'No enough coin transferred');
  assert(amount < MAX_MINT_PRICE, 'Too much coin transferred');

  const args = new Args(binaryArgs);
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');

  assert(tokenId >= u256.One, "TokenId doesn't exist");
  assert(tokenId <= TOTAL_SUPPLY, "TokenId doesn't exist");
  assert(Storage.has(ownerKey(tokenId)) === false, 'Token already minted');

  _update(Context.caller().toString(), tokenId, '');

  generateEvent('Token #' + tokenId.toString() + ' was successfully minted');
}

/**
 *
 * @param binaryArgs - serialized u256 representing the tokenId to burn
 *
 * @remarks This function is not part of the ERC721 standard.
 * It serves as an example of how to use the NFT-internals functions to implement custom features.
 * Here we make use of the _update function from the NFT-internals to burn a token.
 * Indeed, by calling _update with the zero address as a recipient, we are burning the token.
 *
 * We also made sure that the burn feature is only callable by the owner of the token or an approved operator.
 * Indeed, the _update function will check if the caller is the owner of the token or an approved operator.
 *
 */
export function burn(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');
  assert(Context.caller().toString() === _ownerOf(tokenId), 'Only owner of a token can burn it');
  _update('0x0000000000000000000000000000000000000000', tokenId, Context.caller().toString());
}

function generateSvgFromId(id: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect height="500" width="500" fill="#17BEBB"></rect><text font-size="30" fill="#2E282A" font-family="Verdana" text-anchor="middle" alignment-baseline="baseline" x="200" y="250">#${id}</text></svg>`;
}

function generateSvgForUnminted(id: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect height="500" width="500" fill="#DDDDDD"></rect><text font-size="30" fill="#000000" font-family="Verdana" text-anchor="middle" alignment-baseline="baseline" x="220" y="250">#${id} / NOT MINTED</text></svg>`;
}

/**
 * Get the ERC721Metadata tokenURI
 * @param binaryArgs - serialized u256 representing the tokenId
 */
export function tokenURI(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');

  assert(tokenId >= u256.One, "TokenId doesn't exist");
  assert(tokenId <= TOTAL_SUPPLY, "TokenId doesn't exist");

  const stringTokenId = tokenId.toString();
  let metadata: ERC721Metadata;

  if (_ownerOf(tokenId) !== '') {
    metadata = {
      name: 'Token #' + stringTokenId,
      description:
        'The owner of this NFT have certain capabilities ...',
      image: 'data:image/svg+xml;base64,' + encode(stringToBytes(generateSvgFromId(stringTokenId))),
    };
  } else {
    metadata = {
      name: 'Token #' + stringTokenId + ' (not minted)',
      description:
        'Ownership of this NFT will grants certain capabilities ...',
      image: 'data:image/svg+xml;base64,' + encode(stringToBytes(generateSvgForUnminted(stringTokenId))),
    };
  }

  const metadataStringified = JSON.stringify<ERC721Metadata>(metadata);
  return stringToBytes('data:application/json;base64,' + encode(stringToBytes(metadataStringified)));
}

/**
 * Here we re-export the ownerAddress function from the ownership file.
 * This will allow the outside world to check the owner of the contract.
 * However we do not re-export any function from the NFT-internals file.
 * This is because the NFT-internals functions are not supposed to be called directly by the outside world.
 */
export { ownerAddress } from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

export function updateByteCode(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  setBytecodeOf(Context.ownedAddresses()[0], binaryArgs);
  generateEvent('The bytecode was updated');
}
