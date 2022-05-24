// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

//@Developed by DBROLINCONSULTING - Bastien VERMOT DE BOISROLIN
//Moebius Smart Contract

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ERC721A.sol";

contract MoebiusERC721A is Ownable, ERC721A, PaymentSplitter {

    using Strings for uint;

    enum Step {
        Before,
        WhitelistSale,
        PublicSale,
        SoldOut,
        Reveal
    }

    string public notRevealedURI;
    string baseURI;
    Step public sellingStep;

    uint private constant MAX_SUPPLY = 15;
    uint private constant MAX_WHITELIST = 3;
    uint private constant MAX_PUBLIC = 7;
    uint private constant MAX_AIRDROP = 1;
    uint private constant RARE=4; //Burn 5 NFT to be mintable
    uint private airdropDistributed; //To count the number of Airdroped NFT supplied until now;
    bool revealed = false;

    uint public wlSalePrice = 0.0005 ether;
    uint public publicSalePrice = 0.001 ether;

    bytes32 public merkleRoot;

    //For an automatic start
    uint public saleStartTime = 1649631402;

    mapping(address => uint) public amountNFTsperWalletWhitelistSale;

    uint private teamLength;

    //Overriding to get a counter start to 1
    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }

    //*****************Special
    //counterSpecial to get a counterSpecial start after the last public token mintable
    function _startSpecialTokenId() internal view virtual override returns (uint256) {
        return MAX_PUBLIC+MAX_WHITELIST+1;
    }

    constructor(address[] memory _team, uint[] memory _teamShares, bytes32 _merkleRoot, string memory _baseURI, string memory _notRevealedURI) ERC721A("Moebius", "MBS")
    PaymentSplitter(_team, _teamShares) {
        _startTokenId(); //Now we start the counter
        merkleRoot = _merkleRoot;
        baseURI = _baseURI;
        notRevealedURI = _notRevealedURI;
        
        teamLength = _team.length;

        //****Special token
        _startSpecialTokenId();
    }

    //Modifier to avoid Bots minting
    modifier callerIsUser() {
        require(tx.origin == msg.sender, "The caller is another contract");
        _;
    }

    //Adding of reveal option with a boolean
    function reveal() external onlyOwner {
        revealed = true;
    }

    function whitelistMint(uint _quantity, bytes32[] calldata _proof) external payable callerIsUser {
        uint price = wlSalePrice;
        require(price != 0, "Price is 0");
        require(currentTime() >= saleStartTime, "Whitelist Sale has not started yet");
        require(currentTime() < saleStartTime + 1440 minutes, "Whitelist Sale is finished");
        require(sellingStep == Step.WhitelistSale, "Whitelist sale is not activated");
        require(isWhiteListed(msg.sender, _proof), "Not whitelisted");
        require(amountNFTsperWalletWhitelistSale[msg.sender] + _quantity <= 3, "You can only get 3 NFT on the Whitelist Sale");
        require(_totalMinted() + _quantity <= MAX_WHITELIST, "Max supply exceeded");
        require(msg.value >= price * _quantity, "Not enought funds");
        amountNFTsperWalletWhitelistSale[msg.sender] += _quantity;
        _safeMint(msg.sender, _quantity);
    }

    function publicSaleMint(address _account, uint _quantity) external payable callerIsUser {
        require(sellingStep == Step.PublicSale, "Public sale is not activated");
        require(_totalMinted() + _quantity <= MAX_WHITELIST + MAX_PUBLIC, "Max supply exceeded");
        //require(_numberMinted(msg.sender) + _quantity <= 5, "You can only get 5 NFT");
        require(msg.value >= publicSalePrice * _quantity, "Not enought funds");
        _safeMint(_account, _quantity);
    }

    //Airdrop option added
    function airdrop(address _to, uint _quantity) external onlyOwner {
        require(sellingStep > Step.PublicSale, "Gift is after the public sale");
        require(_totalMinted() + _quantity <= MAX_WHITELIST + MAX_PUBLIC, "Reached max Supply");
        require(airdropDistributed + _quantity <= MAX_AIRDROP, "Max Airdrop reached");
        _safeMint(_to, _quantity);
        airdropDistributed+=_quantity; //We increase the counter of Airdroped NFT Tokens;
    }

    function setSaleStartTime(uint _saleStartTime) external onlyOwner {
        saleStartTime = _saleStartTime;
    }

    function setBaseUri(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }

    function currentTime() internal view returns(uint) {
        return block.timestamp;
    }

    function setStep(uint _step) external onlyOwner {
        sellingStep = Step(_step);
    }

    //Function used by Opensea to render pictures
    function tokenURI(uint _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "URI query for nonexistent token");
       
       //If not revealed --> We render a hidden picture
        if(revealed == false) {
            return notRevealedURI;
        }

        return string(abi.encodePacked(baseURI, _tokenId.toString(), ".json"));
    }

    //***Whitelist
    //**********
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function isWhiteListed(address _account, bytes32[] calldata _proof) internal view returns(bool) {
        return _verify(leaf(_account), _proof);
    }

    function leaf(address _account) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(_account));
    }

    function _verify(bytes32 _leaf, bytes32[] memory _proof) internal view returns(bool) {
        return MerkleProof.verify(_proof, merkleRoot, _leaf);
    }
    //**********


    //ReleaseALL
    function releaseAll() external callerIsUser {
        for(uint i = 0 ; i < teamLength ; i++) {
            release(payable(payee(i))); //Function of Payment splitter to get the funds back to the team;
        }
        //We let the function callable by everyone as the contract could be renounce by the owner;
    }

    //Function to receive money on the contract
    receive() override external payable {
        revert('Only if you mint');
    }

    function burn(uint256[] memory tokenIdTab) external {
        require(tokenIdTab.length == 5, "Need 5 nfts in your wallet");
        //1st check to be sure that all parsed tokens are own by caller
        for (uint i=0; i<tokenIdTab.length; i++) {
            if (msg.sender != ownerOf(tokenIdTab[i])) {
                revert();
            }
        }
        //if we pass the step above without reverting: We start the burn fn with a 2nd check inside
        for (uint i=0; i<tokenIdTab.length; i++) {
            _burn(tokenIdTab[i], true);
        }
        _safeSpecialMint(msg.sender);
    }

    function burnedNumber() external view returns(uint) {
        return _burnCounter;
    }

}