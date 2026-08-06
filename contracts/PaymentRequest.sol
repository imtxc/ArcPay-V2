// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PaymentRequest is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant USDC_TOKEN = 0x3600000000000000000000000000000000000000;

    enum Status { Pending, Paid, Rejected, Cancelled }

    struct Request {
        uint256 id;
        address requester;
        address payer;
        uint256 amount;
        string note;
        uint256 timestamp;
        Status status;
    }

    uint256 public totalRequests;
    mapping(uint256 => Request) public allRequests;
    mapping(address => uint256[]) private userIncoming;
    mapping(address => uint256[]) private userOutgoing;

    event RequestCreated(uint256 indexed id, address indexed requester, address indexed payer, uint256 amount);
    event RequestPaid(uint256 indexed id, address indexed payer, address indexed requester, uint256 amount);
    event DirectPaymentSent(address indexed from, address indexed to, uint256 amount);

    /**
     * @notice ADDED: Direct Payment through contract
     */
    function pay(address _to, uint256 _amount) external nonReentrant {
        require(_to != address(0), "Invalid address");
        require(_amount > 0, "Amount 0");
        IERC20(USDC_TOKEN).safeTransferFrom(msg.sender, _to, _amount);
        emit DirectPaymentSent(msg.sender, _to, _amount);
    }

    function createRequest(address _payer, uint256 _amount, string calldata _note) external {
        uint256 requestId = totalRequests++;
        allRequests[requestId] = Request(requestId, msg.sender, _payer, _amount, _note, block.timestamp, Status.Pending);
        userIncoming[_payer].push(requestId);
        userOutgoing[msg.sender].push(requestId);
        emit RequestCreated(requestId, msg.sender, _payer, _amount);
    }

    function acceptAndPay(uint256 _id) external nonReentrant {
        Request storage req = allRequests[_id];
        require(req.status == Status.Pending, "Not pending");
        require(req.payer == msg.sender, "Not payer");
        req.status = Status.Paid;
        IERC20(USDC_TOKEN).safeTransferFrom(msg.sender, req.requester, req.amount);
        emit RequestPaid(_id, msg.sender, req.requester, req.amount);
    }

    function getIncomingRequests(address _user) external view returns (uint256[] memory) { return userIncoming[_user]; }
    function getOutgoingRequests(address _user) external view returns (uint256[] memory) { return userOutgoing[_user]; }
    function getRequestDetails(uint256 _id) external view returns (Request memory) { return allRequests[_id]; }
}