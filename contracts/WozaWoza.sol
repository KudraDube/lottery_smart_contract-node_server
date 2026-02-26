// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract WozaWoza is VRFConsumerBaseV2Plus, AutomationCompatibleInterface {
    // 🚦 THE BREATHING TIME LOCK
    enum LotteryState { OPEN, CALCULATING }
    LotteryState public s_lotteryState;

    struct Ticket {
        address player;
        uint8[7] numbers;
    }

    uint256 public constant TICKET_PRICE = 0.01 ether;
    uint256 public lastDrawTimestamp;
    uint256 public interval = 3 minutes; // ⏱️ CHANGED TO 3 MINUTES!
    
    uint8[7] public lastWinningNumbers;
    Ticket[] public tickets;
    address public s_owner;

    uint256 s_subscriptionId;
    bytes32 keyHash = 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae; 
    uint32 callbackGasLimit = 2500000;
    uint16 requestConfirmations = 3;

    constructor(uint256 subscriptionId, address vrfCoordinator) 
        VRFConsumerBaseV2Plus(vrfCoordinator) 
    {
        s_subscriptionId = subscriptionId;
        lastDrawTimestamp = block.timestamp;
        s_owner = msg.sender;
        s_lotteryState = LotteryState.OPEN; // Doors are open at deployment
    }

    function buyTicket(uint8[7] memory _numbers) external payable {
        // 🛑 PREVENTS BUYING DURING THE DRAW
        require(s_lotteryState == LotteryState.OPEN, "Draw in progress! Please wait for Breathing Time to end.");
        require(msg.value == TICKET_PRICE, "Incorrect ETH amount");
        for(uint i=0; i<7; i++) {
            require(_numbers[i] >= 1 && _numbers[i] <= 49, "Numbers must be 1-49");
        }
        tickets.push(Ticket(msg.sender, _numbers));
    }

    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
        bool timePassed = (block.timestamp - lastDrawTimestamp) > interval;
        bool isOpen = LotteryState.OPEN == s_lotteryState;
        bool hasPlayers = tickets.length > 0;
        
        upkeepNeeded = (timePassed && isOpen && hasPlayers);
    }

    function performUpkeep(bytes calldata) external override {
        if ((block.timestamp - lastDrawTimestamp) > interval && tickets.length > 0 && s_lotteryState == LotteryState.OPEN) {
            
            // 🛑 LOCK THE DOORS! BREATHING TIME STARTS!
            s_lotteryState = LotteryState.CALCULATING; 
            
            s_vrfCoordinator.requestRandomWords(
                VRFV2PlusClient.RandomWordsRequest({
                    keyHash: keyHash,
                    subId: s_subscriptionId,
                    requestConfirmations: requestConfirmations,
                    callbackGasLimit: callbackGasLimit,
                    numWords: 7,
                    extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
                })
            );
        }
    }

    function fulfillRandomWords(uint256, uint256[] calldata randomWords) internal override {
        for (uint i = 0; i < 7; i++) {
            lastWinningNumbers[i] = uint8((randomWords[i] % 49) + 1);
        }
        distributePrizes();
        delete tickets; 
        
        // 🟢 PAYOUTS DONE. RESET TIMER AND UNLOCK THE DOORS!
        lastDrawTimestamp = block.timestamp;
        s_lotteryState = LotteryState.OPEN;
    }

    function distributePrizes() internal {
        uint256 totalPool = address(this).balance;
        if (totalPool == 0) return;

        uint256 ownerFee = totalPool * 10 / 100;
        (bool success, ) = payable(s_owner).call{value: ownerFee}("");
        require(success, "Owner pay failed");

        for (uint i = 0; i < tickets.length; i++) {
            uint8 matchCount = 0;
            for (uint j = 0; j < 7; j++) {
                if (tickets[i].numbers[j] == lastWinningNumbers[j]) {
                    matchCount++;
                } else {
                    break; 
                }
            }

            uint256 payoutPercent = 0;
            if (matchCount == 2) payoutPercent = 5;
            else if (matchCount == 3) payoutPercent = 10;
            else if (matchCount == 4) payoutPercent = 15;
            else if (matchCount == 5 || matchCount == 6) payoutPercent = 20;
            else if (matchCount == 7) payoutPercent = 30;

            if (payoutPercent > 0) {
                uint256 prize = (totalPool * payoutPercent) / 100;
                payable(tickets[i].player).transfer(prize);
            }
        }
    }
}