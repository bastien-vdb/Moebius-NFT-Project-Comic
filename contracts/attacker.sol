pragma solidity 0.8.12;
//SPDX-License-Identifier: UNLICENSED

import "./MoebiusERC721A.sol";

contract attacker {
        //address payable moebiusAddress='0x5FbDB2315678afecb367f032d93F642f64180aa3';
    MoebiusERC721A cible;// = MoebiusERC721A(moebiusAddress);

    function setAddress(address payable _addr) external {
        cible = MoebiusERC721A(_addr);
    }
    function tst()external view returns (uint) {
        uint _tst = uint(cible.sellingStep());
        return _tst;
    }

    function mintAttack(address _account, uint _quantity) external payable {
        cible.publicSaleMint(_account, _quantity);
    }
}