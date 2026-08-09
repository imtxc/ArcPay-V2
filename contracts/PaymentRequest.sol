// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PaymentRequest is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =====================================================
    // CONFIGURATION
    // =====================================================

    // Arc Testnet Official USDC
    address public constant USDC_TOKEN =
        0x3600000000000000000000000000000000000000;

    // 24 hours auto expiry
    uint256 public constant REQUEST_EXPIRY = 24 hours;

    // =====================================================
    // TYPES
    // =====================================================

    enum Status {
        Pending,
        Paid,
        Rejected,
        Cancelled,
        Expired
    }

    struct Request {
        uint256 id;
        address requester;
        address payer;
        string requesterUsername;
        uint256 amount;
        string note;
        uint256 timestamp;
        Status status;
    }

    // =====================================================
    // STORAGE
    // =====================================================

    uint256 public totalRequests;

    mapping(uint256 => Request) public allRequests;
    mapping(address => uint256[]) private userIncoming;
    mapping(address => uint256[]) private userOutgoing;

    // =====================================================
    // EVENTS
    // =====================================================

    event RequestCreated(
        uint256 indexed id,
        address indexed requester,
        address indexed payer,
        uint256 amount,
        string requesterUsername,
        string note
    );

    event RequestPaid(
        uint256 indexed id,
        address indexed payer,
        address indexed requester,
        uint256 amount
    );

    event RequestRejected(uint256 indexed id);

    event RequestCancelled(uint256 indexed id);

    event RequestExpired(uint256 indexed id);

    event DirectPaymentSent(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    // =====================================================
    // INTERNAL EXPIRY CHECK
    // =====================================================

    function _checkAndExpire(uint256 _id)
        internal
        returns (bool)
    {
        Request storage req = allRequests[_id];

        if (
            req.status == Status.Pending &&
            block.timestamp >= req.timestamp + REQUEST_EXPIRY
        ) {
            req.status = Status.Expired;

            emit RequestExpired(_id);

            return true;
        }

        return false;
    }

    // =====================================================
    // DIRECT PAYMENT
    // =====================================================

    function pay(address _to, uint256 _amount)
        external
        nonReentrant
    {
        require(_to != address(0), "Invalid address");
        require(_to != msg.sender, "Cannot pay yourself");
        require(_amount > 0, "Amount must be greater than 0");

        IERC20(USDC_TOKEN).safeTransferFrom(
            msg.sender,
            _to,
            _amount
        );

        emit DirectPaymentSent(
            msg.sender,
            _to,
            _amount
        );
    }

    // =====================================================
    // CREATE REQUEST
    // =====================================================

    function createRequest(
        address _payer,
        uint256 _amount,
        string calldata _note
    ) external {
        require(_payer != address(0), "Invalid payer");
        require(_payer != msg.sender, "Cannot request yourself");
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_note).length <= 120, "Note too long");

        // Temporary: username feature disabled
        string memory username = "";

        uint256 requestId = totalRequests++;

        allRequests[requestId] = Request({
            id: requestId,
            requester: msg.sender,
            payer: _payer,
            requesterUsername: username,
            amount: _amount,
            note: _note,
            timestamp: block.timestamp,
            status: Status.Pending
        });

        userIncoming[_payer].push(requestId);
        userOutgoing[msg.sender].push(requestId);

        emit RequestCreated(
            requestId,
            msg.sender,
            _payer,
            _amount,
            username,
            _note
        );
    }

    // =====================================================
    // ACCEPT & PAY
    // =====================================================

    function acceptAndPay(uint256 _id)
        external
        nonReentrant
    {
        require(_id < totalRequests, "Invalid request ID");

        bool expired = _checkAndExpire(_id);

        require(!expired, "Request has expired");

        Request storage req = allRequests[_id];

        require(req.status == Status.Pending, "Request is not pending");
        require(req.payer == msg.sender, "Only payer can accept");

        req.status = Status.Paid;

        IERC20(USDC_TOKEN).safeTransferFrom(
            msg.sender,
            req.requester,
            req.amount
        );

        emit RequestPaid(
            _id,
            msg.sender,
            req.requester,
            req.amount
        );
    }

    // =====================================================
    // REJECT REQUEST
    // =====================================================

    function rejectRequest(uint256 _id) external {
        require(_id < totalRequests, "Invalid request ID");

        require(
            !_checkAndExpire(_id),
            "Request already expired"
        );

        Request storage req = allRequests[_id];

        require(req.status == Status.Pending, "Request is not pending");
        require(req.payer == msg.sender, "Only payer can reject");

        req.status = Status.Rejected;

        emit RequestRejected(_id);
    }

    // =====================================================
    // CANCEL REQUEST
    // =====================================================

    function cancelRequest(uint256 _id) external {
        require(_id < totalRequests, "Invalid request ID");

        Request storage req = allRequests[_id];

        require(req.status == Status.Pending, "Request is not pending");
        require(req.requester == msg.sender, "Only requester can cancel");

        req.status = Status.Cancelled;

        emit RequestCancelled(_id);
    }

    // =====================================================
    // VIEW FUNCTIONS
    // =====================================================

    function getIncomingRequests(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userIncoming[_user];
    }

    function getOutgoingRequests(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userOutgoing[_user];
    }

    function getRequestDetails(uint256 _id)
        external
        view
        returns (Request memory)
    {
        return allRequests[_id];
    }
}