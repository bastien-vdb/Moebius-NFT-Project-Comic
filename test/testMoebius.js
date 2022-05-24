const {ethers} = require("hardhat");
const {expect} = require("chai");
const { description } = require("@openzeppelin/cli/lib/commands/verify");
const tokens = require("../tokens.json");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

let team = ["0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"];
let teamShares = [100];
let merkleRoot = "0x79e7c3e4a904dd8cff51fa410a678a7264a106cd8cc1b2312df1ae99580592b9";
let baseURI = "ipfs://normal/";
let hiddenBaseURI = "ipfs://hidden/"

let moebius;
let publicPrice;

beforeEach(async()=> {
    let abiAttacker = await ethers.getContractFactory("attacker");
    attacker= await abiAttacker.deploy();

    let abi = await ethers.getContractFactory("MoebiusERC721A");
    [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    moebius = await abi.deploy(team, teamShares, merkleRoot, baseURI, hiddenBaseURI);

    publicPrice = await moebius.publicSalePrice();
    wlSalePrice = await moebius.wlSalePrice();
})

// describe('Deployment', ()=>{
//     it("should be deployed", async() =>{
//         const moebieusAddress = await moebius.address;
//     })

//     it("should be step 0 then 2", async() => {
//         let step = await moebius.sellingStep();
//         expect(step).to.equal(0);
//         //-----
//         let larran = {
//             value: 0
//         }
//         await moebius.setStep(2, larran);
//         step = await moebius.sellingStep();
//         expect(step).to.equal(2);
//     })

//     it('check not revealed URI', async() =>{
//         expect(await moebius.notRevealedURI()).to.equal("ipfs://hidden/");
//     })
//     it('Check selling step = 0', async() =>{
//         expect(await moebius.sellingStep()).to.equal(0);
//     })
//     it('Check wlSalePrice', async() =>{
//         expect(await moebius.wlSalePrice()).to.equal(ethers.utils.parseEther('0.0005'));
//     })
//     it('Check publicSalePrice', async() =>{
//         expect(await moebius.publicSalePrice()).to.equal(ethers.utils.parseEther('0.001'));
//     })
//     it('Check MerkleRoot', async() =>{
//         expect(await moebius.merkleRoot()).to.equal("0x79e7c3e4a904dd8cff51fa410a678a7264a106cd8cc1b2312df1ae99580592b9");
//     })
//     it('Check MerkleRoot', async() =>{
//         expect(await moebius.saleStartTime()).to.equal("1649631402");
//     })
// })

// //--------------------------------------------------
describe("Moebius public Mint", () => {
    it("Public sale is not activated", async()=>{
        await expect(moebius.publicSaleMint(owner.address,2)).to.be.revertedWith('Public sale is not activated');
    })
    it("Public sale is not activated", async()=>{
        await expect(moebius.publicSaleMint(owner.address,2)).to.be.revertedWith('Public sale is not activated');
    })
    it("Not enought funds => 0 ether", async()=>{
        await moebius.setStep(2);
        await expect(moebius.publicSaleMint(owner.address,2)).to.be.revertedWith('Not enought funds');
    })
    it("Not enought funds => less than price", async()=>{
        await moebius.setStep(2);
        
        overrides = {
            value: ethers.utils.parseEther('0.001')
        }

        await expect(moebius.publicSaleMint(owner.address,2, overrides)).to.be.revertedWith('Not enought funds');
    })
    // it("Mint OK => Exact price", async()=>{
    //     await moebius.setStep(2);
    //     overrides = {
    //         value: publicPrice.mul(2)
    //     }
    //     await moebius.publicSaleMint(owner.address,2, overrides);
    //     expect(await moebius.totalSupply()).to.equal(2);
    // })
    // it("Mint OK => More than price", async()=>{
    //     await moebius.setStep(2);
    //     overrides = {
    //         value: publicPrice.mul(5)
    //     }
    //     await moebius.publicSaleMint(owner.address,2, overrides);
    //     expect(await moebius.totalSupply()).to.equal(2);
    // })
    //-------------------require MAX token mintable
    it("Mint K.O => Max mint exceed", async()=>{
        await moebius.setStep(2);
        overrides = {
            value: publicPrice.mul(11)
        }
        await expect(moebius.publicSaleMint(owner.address,11, overrides)).to.be.revertedWith('Max supply exceeded');
    })
    it("Mint OK => Equal Max mint", async()=>{
        await moebius.setStep(2);
        overrides = {
            value: publicPrice.mul(10)
        }
        await moebius.publicSaleMint(owner.address,10, overrides);
        expect(await moebius.totalSupply()).to.equal(10);
    })
    // it("Mint MAX -> Burn -> then mint again: 'Max exceed !", async()=>{
    //     await moebius.setStep(2);
    //     overrides = {
    //         value: publicPrice.mul(10)
    //     }
    //     await moebius.publicSaleMint(owner.address,10, overrides);
    //     await moebius.burn([1,2,3,4,5]);
    //     expect(await moebius.totalSupply()).to.equal(5);

    //     overrides = {
    //         value: publicPrice
    //     }
    //     await expect(moebius.publicSaleMint(owner.address,1, overrides)).to.be.revertedWith('Max supply exceeded');
    // })

    it('test contact contract', async()=>{
        await attacker.setAddress(moebius.address);
        let result = await attacker.tst();
        expect (result).to.equal(0);

        await moebius.setStep(2);
        expect(await attacker.tst()).to.equal(2);
    })
    it('Mint from another smart contract', async()=>{
        await moebius.setStep(2);
        await attacker.setAddress(moebius.address);
        expect(await attacker.tst()).to.equal(2);
                    
        overrides = {
            value: publicPrice
        }
        await expect(attacker.mintAttack(attacker.address, 1, overrides)).to.be.revertedWith("The caller is another contract");
    })
})

// describe('receive fallback function', ()=>{
//     it('Only if you mint msg', async()=>{
//         overrides = {
//             value: publicPrice
//         }
//         await expect(moebius.fallback(overrides)).to.be.revertedWith('Only if you mint');
//     })
// })

// describe('White list', ()=>{

//     it("saleStartTime: Whitelist Sale has not started yet", async()=>{
//         let tab = [];
//         tokens.map((token) => {
//             tab.push(token.address);
//         });
//         const leaves = tab.map((address) => keccak256(address));
//         const tree = new MerkleTree(leaves, keccak256, { sort: true });
//         const leaf = keccak256(addr2.address);
//         const proof = tree.getHexProof(leaf);
    
//         await moebius.setStep(1);
//         await moebius.setSaleStartTime(1683793833);
    
//         overrides = {
//             value: wlSalePrice*2
//         }
//         await expect(moebius.connect(addr2).whitelistMint(2, proof, overrides)).to.be.revertedWith("Whitelist Sale has not started yet");
//         })

//     it("saleStartTime: Whitelist Sale is finished", async()=>{
//         let tab = [];
//         tokens.map((token) => {
//             tab.push(token.address);
//         });
//         const leaves = tab.map((address) => keccak256(address));
//         const tree = new MerkleTree(leaves, keccak256, { sort: true });
//         const leaf = keccak256(addr2.address);
//         const proof = tree.getHexProof(leaf);
    
//         await moebius.setStep(1);
//         await moebius.setSaleStartTime(1651998633);
    
//         overrides = {
//             value: wlSalePrice*2
//         }
//         await expect(moebius.connect(addr2).whitelistMint(2, proof, overrides)).to.be.revertedWith("Whitelist Sale is finished");
//         })

//         it("Whitelist sale is not activated", async()=>{
//             let tab = [];
//             tokens.map((token) => {
//                 tab.push(token.address);
//             });
//             const leaves = tab.map((address) => keccak256(address));
//             const tree = new MerkleTree(leaves, keccak256, { sort: true });
//             const leaf = keccak256(addr2.address);
//             const proof = tree.getHexProof(leaf);
        
//             await moebius.setStep(0);
//             await moebius.setSaleStartTime(1652171433);
        
//             overrides = {
//                 value: wlSalePrice*2
//             }
//             await expect(moebius.connect(addr2).whitelistMint(2, proof, overrides)).to.be.revertedWith("Whitelist sale is not activated");
//             })
    
//     it('isWhiteListed: Not whitelisted', async()=>{
//         let tab = [];
//         tokens.map((token) => {
//             tab.push(token.address);
//         });
//         const leaves = tab.map((address) => keccak256(address));
//         const tree = new MerkleTree(leaves, keccak256, { sort: true });
//         const leaf = keccak256(addr3.address);
//         const proof = tree.getHexProof(leaf);

//         await moebius.setStep(1);
//         await moebius.setSaleStartTime(1652171433);

//         overrides = {
//             value: wlSalePrice*2
//         }
//         await expect(moebius.connect(addr3).whitelistMint(2, proof, overrides)).to.be.revertedWith("Not whitelisted");
//     })

//     it('isWhiteListed: Whitelisted', async()=>{
//         let tab = [];
//         tokens.map((token) => {
//             tab.push(token.address);
//         });
//         const leaves = tab.map((address) => keccak256(address));
//         const tree = new MerkleTree(leaves, keccak256, { sort: true });
//         const leaf = keccak256(addr2.address);
//         const proof = tree.getHexProof(leaf);
    
//         await moebius.setStep(1);
//         await moebius.setSaleStartTime(1652171433);
    
//         overrides = {
//             value: wlSalePrice*2
//         }
//         await moebius.connect(addr2).whitelistMint(2, proof, overrides);
//         })

//     it('MAX amountNFTsperWalletWhitelistSale', async()=>{
//         let tab = [];
//         tokens.map((token) => {
//             tab.push(token.address);
//         });
//         const leaves = tab.map((address) => keccak256(address));
//         const tree = new MerkleTree(leaves, keccak256, { sort: true });
//         const leaf = keccak256(addr2.address);
//         const proof = tree.getHexProof(leaf);
    
//         await moebius.setStep(1);
//         await moebius.setSaleStartTime(1652171433);
    
//         overrides = {
//             value: wlSalePrice*4
//         }
//         await expect(moebius.connect(addr2).whitelistMint(4, proof, overrides)).to.be.revertedWith("You can only get 3 NFT on the Whitelist Sale");
//         })

//     it('Max supply exceeded', async()=>{
//         let tab = [];
//         tokens.map((token) => {
//             tab.push(token.address);
//         });
//         const leaves = tab.map((address) => keccak256(address));
//         const tree = new MerkleTree(leaves, keccak256, { sort: true });
//         let leaf = keccak256(addr2.address);
//         let proof = tree.getHexProof(leaf);
    
//         await moebius.setStep(1);
//         await moebius.setSaleStartTime(1652171433);
    
//         overrides = {
//             value: wlSalePrice*3
//         }
//         await moebius.connect(addr2).whitelistMint(3, proof, overrides)
//         //-----------change for the next user minter
//         leaf = keccak256(addr1.address);
//         proof = tree.getHexProof(leaf);
//         overrides = {
//             value: wlSalePrice
//         }
//         await expect(moebius.connect(addr1).whitelistMint(1, proof, overrides)).to.be.revertedWith("Max supply exceeded");
//         })

//     it("Not enought funds", async()=>{
//         let tab = [];
//         tokens.map((token) => {
//             tab.push(token.address);
//         });
//         const leaves = tab.map((address) => keccak256(address));
//         const tree = new MerkleTree(leaves, keccak256, { sort: true });
//         const leaf = keccak256(addr2.address);
//         const proof = tree.getHexProof(leaf);
    
//         await moebius.setStep(1);
//         await moebius.setSaleStartTime(1652171433);
    
//         overrides = {
//             value: wlSalePrice*1
//         }
//         await expect(moebius.connect(addr2).whitelistMint(2, proof, overrides)).to.be.revertedWith("Not enought funds");
//     })
// })

describe("Airdrop", () => {
    it("Gift is after the public sale", async()=>{
        await expect(moebius.airdrop(owner.address,2)).to.be.revertedWith("Gift is after the public sale");
    })
    it("Gift OK", async()=>{
        await moebius.setStep(3);
        await moebius.airdrop(owner.address,1)
        expect(await moebius.totalSupply()).to.equal(1);
    })
    it("Max Airdrop reached", async()=>{
        await moebius.setStep(3);
        await expect(moebius.airdrop(owner.address,2)).to.be.revertedWith("Max Airdrop reached");
    })
    
})

// describe("Burn", () => {
//     it("Shoud burn 5 nfts", async()=>{
//         overrides = {value: publicPrice*5};
//         await moebius.setStep(2);
//         await moebius.publicSaleMint(owner.address, 5, overrides);
//         await moebius.burn([1,2,3,4,5]);
//         expect(await moebius.totalSupply()).to.equal(0);
//     })
//     it("Need 5 nfts in your wallet", async()=>{
//         await expect(moebius.burn([1,2,3,4])).to.be.revertedWith("Need 5 nfts in your wallet");
//     })
//     it("Shoud create 1 nft with a Special tokenURI", async()=>{
//         overrides = {value: publicPrice*5};
//         await moebius.setStep(2);
//         await moebius.publicSaleMint(owner.address, 5, overrides);
//         await moebius.burn([1,2,3,4,5]);
//         expect(await moebius.ownerOf(11)).to.equal(owner.address);
//         expect(await moebius.burnedNumber()).to.equal(5);
//         expect(await moebius.balanceOf(owner.address)).to.equal(1);
//     })
    
// })

