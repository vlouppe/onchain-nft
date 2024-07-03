import * as dotenv from 'dotenv';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { getEnvVariable } from './utils';
import { WalletClient } from '@massalabs/massa-sc-deployer';
import {
  CHAIN_ID,
  ClientFactory,
  DefaultProviderUrls, EOperationStatus,
  fromMAS,
  MAX_GAS_DEPLOYMENT,
} from '@massalabs/massa-web3';

// Obtain the current file name and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

// Load .env file content into process.env
dotenv.config();

// Get environment variables
const secretKey = getEnvVariable('WALLET_SECRET_KEY');
const scAddress = getEnvVariable('SMART_CONTRACT_ADDRESS');
// Define deployment parameters
const chainId = CHAIN_ID.BuildNet; // Choose the chain ID corresponding to the network you want to deploy to
const maxGas = MAX_GAS_DEPLOYMENT; // Gas for deployment Default is the maximum gas allowed for deployment
const fees = fromMAS(0.01); // Fees to be paid for deployment. Default is 0.01

// Create an account using the private keyc
const deployerAccount = await WalletClient.getAccountFromSecretKey(secretKey);
const web3Client = await ClientFactory.createDefaultClient(
  DefaultProviderUrls.BUILDNET,
  chainId,
  false,
  deployerAccount,
);

const data = readFileSync(path.join(__dirname, 'build', 'main.wasm'));

const bytesToSend = [];
for (let i = 0; i < data.length; i++) {
  bytesToSend.push(data.readUInt8(i));
}

(async () => {
  const data = readFileSync(path.join(__dirname, 'build', 'main.wasm'));

  const bytesToSend = [];
  for (let i = 0; i < data.length; i++) {
    bytesToSend.push(data.readUInt8(i));
  }

  const operationId = await web3Client.smartContracts().callSmartContract({
    fee: fees,
    maxGas: maxGas,
    coins: fromMAS(0),
    targetAddress: scAddress,
    targetFunction: 'updateByteCode',
    parameter: bytesToSend,
  });

  const status = await web3Client
    .smartContracts()
    .awaitMultipleRequiredOperationStatus(operationId, [
      EOperationStatus.SPECULATIVE_SUCCESS,
      EOperationStatus.SPECULATIVE_ERROR,
    ]);
  if (!(status === EOperationStatus.SPECULATIVE_SUCCESS)) {
    const error = await web3Client.smartContracts().getFilteredScOutputEvents({
      start: null,
      end: null,
      original_operation_id: operationId,
      original_caller_address: null,
      emitter_address: null,
      is_final: null,
    });
    // eslint-disable-next-line no-console
    console.log(error);
  } else {
    // eslint-disable-next-line no-console
    console.log('Bytecode was updated !');
  }
})();
