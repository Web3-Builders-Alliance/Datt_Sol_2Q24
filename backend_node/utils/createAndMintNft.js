import wallet from "../wba-wallet.json" assert { type: "json" };
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createGenericFile,
  createSignerFromKeypair,
  signerIdentity,
  generateSigner,
  percentAmount,
} from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { readFile } from "fs/promises";
import base58 from "bs58";
import { PublicKey } from "@solana/web3.js";

import { createAssociatedToken } from "@metaplex-foundation/mpl-toolbox";

const RPC_ENDPOINT = "https://api.devnet.solana.com";
const umi = createUmi(RPC_ENDPOINT);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));
umi.use(mplTokenMetadata());

const mint = generateSigner(umi);

export async function createAndMintNft(prompt, pubKey, imageName, model) {
  try {
    const image = await readFile(`./images/${imageName}`);

    const genericFile = createGenericFile(image, imageName, {
      contentType: "image/png",
    });

    const [imageUri] = await umi.uploader.upload([genericFile]);
    console.log("Your image URI: ", imageUri);

    const metadata = {
      name: `${imageName}`,
      symbol: `${model}`,
      description: `prompt: ${prompt} model: ${model}`,
      image: imageUri,
      attributes: [
        {
          trait_type: "Public Key",
          value: pubKey,
          trait_type: "Prompt",
          value: prompt,
          trait_type: "Model",
          value: model,
        },
      ],
      properties: {
        files: [
          {
            type: "image/png",
            uri: imageUri,
          },
        ],
      },
      creators: [],
    };
    const metadataUri = await umi.uploader.uploadJson(metadata);
    console.log("Your metadata URI: ", metadataUri);

    const recipientPubKey = new PublicKey(pubKey);
    const recipientTokenAccount = await createAssociatedToken(umi, {
      payer: signer,
      mint: mint.publicKey,
      owner: recipientPubKey,
    });

    let tx = createNft(umi, {
      mint: mint,
      name: imageName,
      description: `prompt: ${prompt} model: ${model}`,
      symbol: model,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(5, 2),
      tokenOwner: recipientPubKey,
      tokenAddress: recipientTokenAccount.address,
    });

    let result = await tx.sendAndConfirm(umi);
    const signature = base58.encode(result.signature);

    console.log(
      `Successfully Minted and Transferred NFT! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`
    );
    console.log("Mint Address: ", mint.publicKey);

    return {
      imageUri,
      metadataUri,
      mintAddress: mint.publicKey,
      transactionSignature: signature,
    };
  } catch (error) {
    console.log("Oops.. Something went wrong", error);
    throw error;
  }
}
