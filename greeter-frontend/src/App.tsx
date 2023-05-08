import React, { useState, useEffect } from "react";
import { Contract, Web3Provider, Provider, Signer, utils } from "zksync-web3";
import { ethers } from "ethers";

import "./App.css";
import allowedTokens from "./abis/erc20.json";
import greeterAbi from "./abis/greeter.json";

declare global {
  interface Window {
    ethereum: any;
  }
}

type Token = {
  l1Address: string;
  l2Address: string;
  decimals: number;
  symbol: string;
};

// Address for the Greeter contract on L2
const GREETER_CONTRACT_ADDRESS = "0xcA265A121192796216BcC6A991BccF523c72b55e";
// Placeholder token address for L1 ETH
const ETH_L1_ADDRESS = "0x0000000000000000000000000000000000000000";

const App: React.FC = () => {
  // Web3 state
  const [provider, setProvider] = useState<Provider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);

  // Token list and selection
  const [tokens] = useState(allowedTokens);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("");

  // App state
  const [newGreeting, setNewGreeting] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("unknown");

  const [connected, setConnected] = useState<boolean>(false);
  const [txStatus, setTxStatus] = useState<number>(0);
  const [retrievingFee, setRetrievingFee] = useState<boolean>(false);
  const [retrievingBalance, setRetrievingBalance] = useState<boolean>(false);

  const [currentBalance, setCurrentBalance] = useState<string>("");
  const [currentFee, setCurrentFee] = useState<string>("");

  // Fetch the current greeting from the Greeter contract
  const getGreeting = async (): Promise<string> => {
    return await contract?.greet();
  };

  // Fetch fee estimate interacting with the Greeter contract
  const getFee = async (): Promise<string> => {
    if (!provider || !contract || !selectedToken) {
      return "";
    }

    try {
      const feeInGas = await contract.estimateGas.setGreeting(newGreeting);
      const gasPriceInUnits = await provider.getGasPrice();

      return ethers.utils.formatUnits(
        feeInGas.mul(gasPriceInUnits),
        selectedToken.decimals
      );
    } catch (e) {
      console.log(e);
      return "";
    }
  };

  // Fetch the current balance of the selected token
  const getBalance = async (): Promise<string> => {
    if (!signer || !selectedToken) {
      return "";
    }

    try {
      const balanceInUnits =
        selectedToken.l1Address === ETH_L1_ADDRESS
          ? await signer.getBalance()
          : await signer.getBalance(selectedToken.l2Address);
      return ethers.utils.formatUnits(balanceInUnits, selectedToken.decimals);
    } catch (e) {
      console.log(e);
      return "";
    }
  };

  // Get the transaction paramters needed to pay fees via the selected token
  // This uses the testnet paymaster (https://era.zksync.io/docs/dev/developer-guides/aa.html#paymasters)
  const getOverrides = async () => {
    if (!provider || !selectedToken || !contract) {
      return {};
    }
    if (selectedToken && selectedToken.l1Address !== ETH_L1_ADDRESS) {
      const testnetPaymaster = await provider.getTestnetPaymasterAddress();
      if (!testnetPaymaster) {
        return {};
      }

      const gasPrice = await provider.getGasPrice();

      // get params for gas estimation
      const paramsForFeeEstimation = utils.getPaymasterParams(
        testnetPaymaster,
        {
          type: "ApprovalBased",
          minimalAllowance: ethers.BigNumber.from("1"),
          token: selectedToken.l2Address,
          innerInput: new Uint8Array(),
        }
      );

      const gasLimit = await contract.estimateGas.setGreeting(newGreeting, {
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          paymasterParams: paramsForFeeEstimation,
        },
      });

      const fee = gasPrice.mul(gasLimit.toString());

      // get params for submitting tx
      const paymasterParams = utils.getPaymasterParams(testnetPaymaster, {
        type: "ApprovalBased",
        token: selectedToken.l2Address,
        minimalAllowance: fee,
        // empty bytes as testnet paymaster does not use innerInput
        innerInput: new Uint8Array(),
      });

      return {
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: ethers.BigNumber.from(0),
        gasLimit,
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          paymasterParams,
        },
      };
    }

    return {};
  };

  // Change the greeting on the Greeter contract and update the UI
  const changeGreeting = async (): Promise<void> => {
    if (!contract) {
      return;
    }

    setTxStatus(1);

    try {
      const txHandle = await contract.setGreeting(
        newGreeting,
        await getOverrides()
      );

      setTxStatus(2);

      // Wait for transaction to be committed
      await txHandle.wait();

      setTxStatus(3);
      setGreeting(await getGreeting());
    } catch (e) {
      console.log(e);
    } finally {
      setTxStatus(0);
      setRetrievingFee(false);
      setRetrievingBalance(false);
    }
  };

  // Get fee estimation and update UI
  const updateFee = () => {
    setRetrievingFee(true);
    getFee()
      .then((fee) => {
        setCurrentFee(fee);
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setRetrievingFee(false);
      });
  };

  // Get balance for selected token and update UI
  const updateBalance = () => {
    setRetrievingBalance(true);
    getBalance()
      .then((balance) => {
        setCurrentBalance(balance);
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setRetrievingBalance(false);
      });
  };

  // Apply the token selection change
  const changeToken = () => {
    if (!provider || !selectedTokenAddress) {
      return;
    }
    setRetrievingFee(true);
    setRetrievingBalance(true);
    const l1Token =
      selectedTokenAddress === ETH_L1_ADDRESS
        ? {
            address: ETH_L1_ADDRESS,
            decimals: 18,
            symbol: "ETH",
            name: "Ether",
          }
        : tokens.filter((t: any) => t.address === selectedTokenAddress)[0];
    const l2TokenAddress = async (address: string) => {
      return provider.l2TokenAddress(address);
    };
    l2TokenAddress(l1Token.address)
      .then((l2Address) => {
        setSelectedToken({
          l1Address: l1Token.address,
          l2Address: l2Address,
          decimals: l1Token.decimals,
          symbol: l1Token.symbol,
        }); // triggers updateFee and updateBalance
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setRetrievingFee(false);
        setRetrievingBalance(false);
      });
  };

  // Connect to wallet, zkSync provider and contract
  const connectMetamask = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const web3Provider = new Web3Provider(window.ethereum);
        const network = await web3Provider.getNetwork();

        if (network.chainId === 280) {
          // Initialize zkSync SDK provider
          const provider = new Provider("https://testnet.era.zksync.dev");
          const signer = web3Provider.getSigner();
          const contract = new Contract(
            GREETER_CONTRACT_ADDRESS,
            greeterAbi,
            signer
          );

          setProvider(provider);
          setSigner(signer);
          setContract(contract);

          setConnected(true);
          setSelectedTokenAddress(ETH_L1_ADDRESS); // triggers updateFee and updateBalance
        } else {
          alert("Please switch network to zkSync!");
        }
      } catch (e) {
        console.log(e);
      }
    }
  };

  // set token on selection change
  useEffect(() => {
    if (connected) {
      changeToken();
    }
  }, [selectedTokenAddress]);

  // update fee and balance on token or greeting change
  useEffect(() => {
    updateBalance();
    updateFee();
  }, [selectedToken, greeting]);

  useEffect(() => {
    if (connected) {
      getGreeting().then((greeting) => {
        setGreeting(greeting);
      });
    }
  }, [connected]);

  return (
    <>
      {connected ? (
        <div className="app">
          <h1>Greeter says: {greeting} 👋</h1>
          <div>
            <p>
              This dApp lets you change the greeting message of the `Greeter`
              smart contract.
            </p>
            <p>
              You can select a token to pay the gas fee using the zkSync testnet
              paymaster.
            </p>
          </div>
          <div className="main-box">
            <div>
              Select token for fee:
              <select
                value={selectedTokenAddress}
                onChange={(e) => setSelectedTokenAddress(e.target.value)}
              >
                {tokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
            {selectedToken && (
              <>
                <div className="balance">
                  <p>
                    Balance:{" "}
                    {retrievingBalance
                      ? "Loading..."
                      : `${currentBalance} ${selectedToken.symbol}`}
                  </p>
                </div>
                <div className="balance">
                  <p>
                    Expected fee:{" "}
                    {retrievingFee
                      ? "Loading..."
                      : `${currentFee} ${selectedToken.symbol}`}
                    <button className="refresh-button" onClick={updateFee}>
                      Refresh
                    </button>
                  </p>
                </div>
              </>
            )}
            <div className="greeting-input">
              <input
                value={newGreeting}
                onChange={(e) => setNewGreeting(e.target.value)}
                disabled={!selectedToken || txStatus !== 0}
                placeholder="Write new greeting here..."
              />

              <button
                className="change-button"
                disabled={!selectedToken || txStatus !== 0 || retrievingFee}
                onClick={changeGreeting}
              >
                {selectedToken && !txStatus
                  ? "Change greeting"
                  : !selectedToken
                  ? "Select token to pay fee first"
                  : txStatus === 1
                  ? "Sending tx..."
                  : txStatus === 2
                  ? "Waiting until tx is committed..."
                  : txStatus === 3
                  ? "Updating the page..."
                  : "Updating the fee..."}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="app">
          <div className="start-screen">
            <h1>Welcome to the Greeter dApp!</h1>
            <button onClick={connectMetamask}>Connect Metamask</button>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
