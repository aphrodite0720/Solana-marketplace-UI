// import { useTooltipState, Tooltip, TooltipArrow, TooltipReference } from "reakit/Tooltip";
import { PublicKey } from "@solana/web3.js"
import {
  HeartIcon as HeartIconSolid,
  ThumbUpIcon as ThumbUpSolid,
  ThumbDownIcon as ThumbDownSolid,
} from "@heroicons/react/solid"
import {
  HeartIcon as HeartIconOutline,
  ClipboardCopyIcon,
  ExclamationCircleIcon,
  MusicNoteIcon,
  RefreshIcon,
  TerminalIcon,
  ThumbUpIcon,
  ThumbDownIcon,
} from "@heroicons/react/outline"
import { ReactComponent as VerifiedCircle } from "../../assets/icons/user-verified.svg"
import { StyledSelect } from "../StyledSelect";

// @ts-ignore
import { IKImage } from "imagekitio-react"
import { HTMLContent } from "../NftTypes"
import { useEffect, useState, useContext } from "react"
import { useInputState } from "../../hooks/useInputState"
import { useAccountByMint } from "../../hooks/useAccountByMint"
import { NftRoyaltyCalculator } from "../NftRoyaltyCalculator"
import {
  getImagePath,
  IMAGE_KIT_ENDPOINT_URL,
  isImageInCache,
} from "../../constants/images"
import * as ROUTES from "../../constants/routes"
import { useWallet } from "../../contexts/wallet"
import { ActiveOffer, Metadata, SaleData, EscrowInfo } from "../../types"
import BottomBanner from "../BottomBanner"
import { ConnectButton } from "../ConnectButton"
import { NotificationModal } from "../NotificationModal"
import { VotingBar } from "../VotingBar"
import { VerifeyedBadge } from "../VerifeyedBadge"
import { UnverifeyedBadge } from "../../components/UnverifeyedBadge"
import { DerivativeBadge } from "../../components/DerivativeBadge"

import "@google/model-viewer"
// @ts-ignore
import { useUserAccounts } from "../../hooks"
import {
  buyOfferTx,
  sellTx,
  cancelSellTx,
  lowerPrice,
} from "../../contracts/direct-sell"
import { initDutchAuctionTx,cancelDutchAuctionTx, buyAuctionTx } from "../../contracts/dutch-auction";
import {
  buyOfferTx as buyOfferTxEscrow,
  sellTx as sellTxEscrow,
} from "../../contracts/escrow"
import { useConnection, useConnectionConfig } from "../../contexts/connection"
import {
  getEscrowContract,
  getEscrowFromCollectionName,
  toPublicKey,
  kFormatter,
  authApiRequest,
} from "../../utils"
import { LAMPORTS_PER_SOL } from "../../constants"
import dayjs from "dayjs"
import { Divider } from "../Divider"
import {
  BASE_URL_OFFERS_RETRIEVER,
  BASE_URL_COLLECTION_SALES_HISTORY,
  SOL_SCAN_BASE_URL,
  REACT_TO_ENTITY,
} from "../../constants/urls"
import AudioContext, { IAudioContext } from "../../contexts/audio"
import { shortenAddress } from "../../utils"
import { handlerFavorites, itemIsFavorite } from "../../utils"
import { Attributes } from "../Attributes"
import { NFTDetailsAccordion } from "../NFTdetailsAccordion"
import { NFTDescriptionAccordion } from "../NftDescriptionAccordion"
import { Link, useHistory, useParams } from "react-router-dom"
import {DutchCountdown} from "../DutchCountdown"

import {
  useTooltipState,
  Tooltip,
  TooltipArrow,
  TooltipReference,
} from "reakit/Tooltip"
import { useTabState, Tab, TabList, TabPanel } from "reakit/Tab"
import {
  DIRECT_SELL_CONTRACT_ID,
  DIRECT_SELL_TAX_ID,
  DIRECT_SELL_TAX_AMOUNT,
  DUTCH_AUCTION_CONTRACT_ID,
  DUTCH_AUCTION_TAX_ID,
  DUTCH_AUCTION_TAX_AMOUNT
} from "../../constants/contract_id"
import { DomainName, getUserDomains } from "../../utils/name-service"
import { getDomainList } from "../../utils/getDomainList"
import { toast } from "react-toastify"

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerJSX &
        React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}

interface ModelViewerJSX {
  src: string
  poster?: string
  minimumRenderScale?: number
}
interface SaleHistoryTransaction {
  metadata: {
    price: string
    signature: string
    type: string
  }
  timestamp: number
  participants: any
}

interface NftDetailsProps {
  cancelAction: () => void
  successAction?: () => void
  nftData: ActiveOffer
  customContract?: EscrowInfo
  buttonText?: string
  // buttonLoading?: boolean;
  cancelText?: string
  dialogTitle: string
  isListed?: boolean
  disputedMessage?: string
  collection?: string
  refreshItem: () => void
  statusOnchain?: string
  isToken?: boolean
  isTokenListed?: boolean
  isVerified?: boolean
  isDerivative?:boolean
}

export const NftDetails: React.FC<NftDetailsProps> = ({
  nftData,
  customContract,
  cancelAction,
  successAction,
  cancelText,
  buttonText,
  dialogTitle,
  children,
  isListed,
  disputedMessage,
  collection,
  refreshItem,
  statusOnchain,
  isToken,
  isTokenListed,
  isVerified,
  isDerivative
}) => {
  const { wallet } = useWallet();
  const connection = useConnection();
  const { endpoint } = useConnectionConfig();
  const [displayCopyBanner, setDisplayCopyBanner] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isNoticeLoading, setIsNoticeLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const [listingNotice, setListingNotice] = useState("");
  const [listingPrice, handleListingPriceChange] = useInputState(0);
  const [dutchStartPrice, handleDutchStartPriceChange] = useInputState(0);
  const [dutchReservePrice, handleDutchReservePriceChange] = useInputState(0);
  const [dutchDuration, setDutchDuration] = useState('');
  const [dutchDurationSeconds, setDutchDurationSeconds] = useState('');


  const [dutchCustomDuration, setDutchCustomDuration] = useState(0);
  const [dutchCustomDurationDays, handleDutchCustomDurationDaysChange] = useInputState(0);
  const [dutchCustomDurationHours, handleDutchCustomDurationHoursChange] = useInputState(0);

  const [dutchDurationCustomInterval, setDutchDurationCustomInterval] = useState(0);
  const [dutchDurationCustomIntervalHours, handleDutchDurationCustomIntervalHoursChange] = useInputState(0);
  const [dutchDurationCustomIntervalMins, handleDutchDurationCustomIntervalMinsChange] = useInputState(0);
  const [dutchIntervalCustomPrice, handleDutchIntervalCustomPriceChange] = useInputState(0);
  const [offersByOwner, setOffersByOwner] = useState<[]>([]);
  const [tokensUnlisted, setTokensUnlisted] = useState(0);
  const [tokensAmount, setTokensAmount] = useState(0);
  const {
    listedMintsFromEscrow,
    setListedMintsFromEscrow,
    mintsInWalletUnlisted,
    setMintsInWalletUnlisted,
    listedMintsFromDirectSell,
    setListedMintsFromDirectSell,
  } = useUserAccounts();
  const audio: IAudioContext = useContext(AudioContext);
  const history = useHistory();
  const { isVerifeyed, metadata, mint, escrowPubkeyStr, price } = nftData;
  const timeLeftonPrice =  nftData.interval - ((Math.floor(Date.now()/1000) - nftData.startingTs) % nftData.interval);

  let collectionMeta
  try {
    collectionMeta = !!nftData.collection && JSON.parse(nftData.collection)
  } catch (e) {
    collectionMeta = ""
  }

  const collectionName = nftData.collectionName
    ? nftData.collectionName
    : !!collectionMeta
    ? collectionMeta.name
    : "unverifeyed"
  const collectionDesc =
    metadata && metadata.description != ""
      ? metadata.description
      : collectionMeta
      ? collectionMeta.description
      : ""
  const contract = getEscrowFromCollectionName(endpoint, collectionName)
  const escrow = getEscrowContract(endpoint, contract?.escrowProgram)
  const { name, image, ...rest } = { ...metadata }
  const [domainNames, setDomainNames] = useState<(DomainName | undefined)[]>()
  const [salesHistory, setSalesHistory] = useState<SaleData[]>([])
  const [isSalesHistoryLoading, setIsSalesHistoryLoading] = useState<boolean>()
  const [videoFailed, setVideoFailed] = useState<boolean>()
  const [isFavorite, setIsFavorite] = useState<boolean>(itemIsFavorite(nftData))
  const [showLowerPrice, setShowLowerPrice] = useState<boolean>()
  const [copied, setCopied] = useState<boolean>(false)
  const [cacheFailed, setCacheFailed] = useState<boolean>(false)
  const [mintPrice, setMintPrice] = useState<Number>()
  const [isOwnedByWallet, setIsOwnedByWallet] = useState<boolean>(false)
  const [isEscrowListing, setIsEscrowListing] = useState<boolean>(false)
  const [isTokenWithoutPK, setIsTokenWithoutPK] = useState<boolean>(false)
  const [notificationTitle, setNotificationTitle] = useState(
    "Please don’t close this modal while we confirm your purchase on the blockchain"
  )
  const [notificationDesc, setNotificationDesc] = useState(
    "After wallet approval, your transaction will be finished shortly…"
  )
  const [notificationCanClose, setNotificationCanClose] =
    useState<boolean>(false)
  const [modalTimer, setModalTimer] = useState<number>(0)
  const tooltipConnectWallet = useTooltipState()
  const tab = useTabState()

  const cacheFallback = (parentNode: any) => {
    setCacheFailed(true)
  }

  useEffect(() => {
    ;(async () => {
      if (nftData?.owner) {
        setDomainNames(
          await getUserDomains(connection, toPublicKey(nftData?.owner))
        )
      }
    })()
  }, [nftData?.owner, connection])

  const copyLink = () => {
    setCopied(true)
    navigator.clipboard.writeText(
      `${window.location.origin}${ROUTES.ITEM}/${collectionName}/${nftData.mint}?pk=${nftData.escrowPubkeyStr}`
    )
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  const closeAndResetModal = () => {
    setButtonLoading(false)
    setNotificationTitle(
      "Please don’t close this modal while we confirm your purchase on the blockchain"
    )
    setNotificationDesc(
      "After wallet approval, your transaction will be finished shortly…"
    )
    setModalTimer(5)
  }

  const successText =
    isListed || (!isListed && statusOnchain == "listed")
      ? `You've successfully unlisted ${name}. Please allow some time for the changes to be reflected in the listing and in your wallet.`
      : `You've successfully bought ${name} for ${price} SOL. Please allow some time for the changes to be reflected in the listing and in your wallet.`

  // const pageTitle = !isListed ? `List ${name}` : isOwnedByWallet ? `Unlist ${name}` : `Buy ${name}`;
  const pageTitle = `${name}`;

  useEffect(() => {
    const customDuration = (dutchCustomDurationDays * 24 * 60 * 60) + (dutchCustomDurationHours * 60 * 60);
    setDutchCustomDuration( customDuration )
  },[dutchCustomDurationDays, dutchCustomDurationHours])

  useEffect(() => {
    const customInterval = (dutchDurationCustomIntervalHours * 60 * 60) + (dutchDurationCustomIntervalMins * 60)
    setDutchDurationCustomInterval( customInterval )
  },[dutchDurationCustomIntervalHours, dutchDurationCustomIntervalMins])


  useEffect(() => {
    (async () => {
      if (nftData?.owner) {
        setDomainNames(await getUserDomains(connection, toPublicKey(nftData?.owner)));
      }
    })();
  }, [nftData?.owner, connection]);



  const accountByMint = useAccountByMint(mint)
  const search = window.location.search
  const params = new URLSearchParams(search)
  const pk = params.get("pk")
  const fromWalletP = params.get("wallet")
  const fromWallet = fromWalletP === "1" ? true : false

  useEffect(() => {
    if (wallet?.publicKey && accountByMint && accountByMint.info) {
      console.log(accountByMint.info)
      setIsOwnedByWallet(
        accountByMint.info.amount.toNumber() == 1 && accountByMint.info.owner.toString() == wallet.publicKey.toString()
      )
      console.log(accountByMint.info.owner.toString() == wallet.publicKey.toString());
    }
    if (
      nftData.initializerPubkey &&
      wallet?.publicKey &&
      wallet?.publicKey.toString() != nftData.initializerPubkey
    ) {
      setIsOwnedByWallet(false)
      console.log("not owned by wallet");

    }
  }, [wallet?.publicKey, accountByMint])

  useEffect(() => {
    if (
      isToken &&
      wallet?.publicKey &&
      (pk === "undefined" || !pk || fromWallet)
    ) {
      const getTokensByOwner = async () => {
        const getTokensByOwnerRes = await fetch(
          `${BASE_URL_OFFERS_RETRIEVER}?mint=${mint}&owner=${wallet?.publicKey!.toString()}`
        )
        const offersByOwner = await getTokensByOwnerRes.json()
        if (offersByOwner.offers.length) {
          setOffersByOwner(offersByOwner.offers)
        }
      }
      getTokensByOwner()
    }
  }, [isToken, nftData])

  useEffect(() => {
    if (!connection) return
    const getTokenAccount = async () => {
      if (wallet?.publicKey) {
        setIsNoticeLoading(true)
        const connectedWallet = wallet.publicKey.toString()

        if (isToken) {
          const tokenAccountInfo =
            await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
              mint: new PublicKey(mint),
            })
          if (tokenAccountInfo.value.length) {
            const tokenAmountOwned = await tokenAccountInfo.value[0].account
              .data.parsed.info.tokenAmount.uiAmount
            const offersEscrow = offersByOwner.filter(
              (offer: ActiveOffer) =>
                offer.contract == "A7p8451ktDCHq5yYaHczeLMYsjRsAkzc3hCXcSrwYHU7"
            ).length
            const offersDirect = offersByOwner.filter(
              (offer: ActiveOffer) =>
                offer.contract != "A7p8451ktDCHq5yYaHczeLMYsjRsAkzc3hCXcSrwYHU7"
            ).length
            setTokensUnlisted(tokenAmountOwned - offersDirect)
            setTokensAmount(tokenAmountOwned)

            if (
              nftData.initializerPubkey != connectedWallet &&
              tokenAccountInfo.value.length > 1
            ) {
              setIsOwnedByWallet(true)
              setNotice(
                "It looks like you have moved this item to a different wallet. Please move it back to unlist or lower the price."
              )
            }
          }
        } else {
          const tokenAccountsMint = await connection.getTokenLargestAccounts(
            new PublicKey(mint)
          )
          const token = tokenAccountsMint.value[0].address.toString()
          const infoToken = await connection.getParsedAccountInfo(
            new PublicKey(token)
          )
          const data = infoToken!.value!.data!
          // @ts-ignore
          const currentWallet = data.parsed.info.owner

          if (nftData.contract == DIRECT_SELL_CONTRACT_ID) {
            if (
              nftData.initializerPubkey == connectedWallet &&
              connectedWallet != currentWallet
            ) {
              setIsOwnedByWallet(true)
              setNotice(
                "It looks like you have moved this item to a different wallet. Please move it back to unlist or lower the price."
              )
            }
            if (
              (nftData.initializerPubkey != connectedWallet &&
                connectedWallet == currentWallet) ||
              currentWallet != nftData.initializerPubkey
            ) {
              setIsOwnedByWallet(false)
              setNotice(
                "The nft has moved from the wallet that listed it, it currently can not be purchased."
              )
            }
          }
        }
        setIsNoticeLoading(false)
      }
    }
    getTokenAccount()

    return () => {
      setTokensUnlisted(0)
    }
  }, [wallet?.publicKey, connection, nftData])

  useEffect(() => {
    if (
      (nftData.contract && nftData.contract != DIRECT_SELL_CONTRACT_ID) ||
      statusOnchain == "escrow"
    ) {
      setIsEscrowListing(true)
    }
    // setMintPrice(nftData.price);
  }, [nftData])

  useEffect(() => {
    if( dutchReservePrice > 0 && dutchStartPrice > 0 && dutchReservePrice > dutchStartPrice ) {
      setListingNotice("Starting price must be higher than reserve price.");
    } else {
      setListingNotice("");
    }
  }, [dutchReservePrice, dutchStartPrice])

  useEffect(() => {
  if(dutchDuration=="custom"){
    if(dutchCustomDurationDays % 1 != 0 || dutchCustomDurationHours % 1 != 0 ) {
      setListingNotice("Invalid Input. No decimals allowed");
    } else {
      setListingNotice("");
    }}
  }, [dutchCustomDurationDays, dutchCustomDurationHours,dutchStartPrice,dutchReservePrice])

  useEffect(() => {
  if(dutchDuration=="advanced"){
    if(dutchDurationCustomIntervalHours % 1 != 0 || dutchDurationCustomIntervalMins % 1 != 0 ) {
      setListingNotice("Invalid Input. No decimals allowed");
    } else {
      setListingNotice("");
    }
    const priceString = dutchIntervalCustomPrice.toString();
    if(priceString.split('.')[1] && priceString.split('.')[1].length > 2) {
      setListingNotice("Too may decimals in Price Decrement");
    } else {
      setListingNotice("");
    }

  }

}, [dutchDurationCustomIntervalHours, dutchDurationCustomIntervalMins,dutchStartPrice,dutchReservePrice,dutchIntervalCustomPrice])

  useEffect(() => {
    if (!mintPrice && nftData.price) {
      setMintPrice(nftData.price)
    }
  }, [mintPrice])

  useEffect(() => {
    ;(async () => {
      setIsSalesHistoryLoading(true)
      let fullSalesHistory: {
        sales_history: SaleData[]
      }
      try {
        fullSalesHistory = await (
          await fetch(
            `${BASE_URL_COLLECTION_SALES_HISTORY}?&mint=${mint}&type=SALE`
          )
        ).json()
        setSalesHistory(fullSalesHistory?.sales_history || [])
      } catch (error) {}
      setIsSalesHistoryLoading(false)
    })()
  }, [mint, collectionName])

useEffect(() => {
    if( isToken && nftData ) {
      if( offersByOwner ) {
        if( !offersByOwner.length && (!pk || pk === 'undefined' || !isTokenListed || fromWallet)) {
          setIsTokenWithoutPK(true)
        }
      }
    }
  }, [nftData, offersByOwner, pk])

  async function listOffer(): Promise<void> {
    setButtonLoading(true)
    try {
      if (wallet && listingPrice) {
        if (customContract) {
          await sellTxEscrow(
            connection,
            wallet,
            customContract.escrowProgram,
            customContract.escrowTaxRecipient,
            mint,
            listingPrice
          )
        } else {
          await sellTx(connection, wallet, mint, listingPrice)
        }

        setMintPrice(listingPrice)
        await setListedMintsFromDirectSell([...listedMintsFromDirectSell, mint])
        await setMintsInWalletUnlisted(
          mintsInWalletUnlisted.filter((item: string) => item != mint)
        )

        setNotificationTitle(`Success!`)
        setNotificationDesc(
          `You've successfully listed ${name} for ${listingPrice} SOL. Please allow some time for the changes to be reflected in the listing and in your wallet.`
        )
        setNotificationCanClose(true)
        setModalTimer(5)
      }
    } catch (error) {
      setNotificationTitle(`Oops, something went wrong!`)
      setNotificationDesc((error as Error).message)
      setNotificationCanClose(true)
    }
    setTimeout(() => {
      closeAndResetModal()
      setNotificationCanClose(false)
      refreshItem()
    }, 5000)
  }

  async function listOfferDutch(): Promise<void> {
    setButtonLoading(true);
    const priceMargin = dutchStartPrice - dutchReservePrice;
    const interval = (
      dutchDuration=="1-day" ? 300 ://5 mins decrement intervals for 1 day auctions :
      dutchDuration=="3-day" ? 600 ://10 mins decrement intervals for 3 day auctions:
      dutchDuration=="7-day" || dutchDuration=="custom" ? 1800 ://30 mins decrement intervals for 7 day & custom duration auctions:
      dutchDuration=="advanced" ? dutchDurationCustomInterval : 0
    );

    const priceStep = (
      dutchDuration=="1-day" ? (priceMargin/(1*24*60*60))*300 :
      dutchDuration=="3-day" ? (priceMargin/(3*24*60*60))*600 :
      dutchDuration=="7-day" ? (priceMargin/(7*24*60*60))*1800 :
      dutchDuration=="custom" ? (priceMargin/dutchCustomDuration)*1800 :
      dutchDuration=="advanced" ? dutchIntervalCustomPrice : 0
    )

    try {
      if (wallet) {
        await initDutchAuctionTx(connection, wallet, mint, dutchStartPrice, dutchReservePrice, priceStep, interval);
        setMintPrice(dutchStartPrice);
        setNotificationTitle(`💰 Your Auction is Now Live!`);
        setNotificationDesc(
          `Your auction for ${name} has begun at ${dutchStartPrice} SOL. Please allow some time for the changes to be reflected in the listing and in your wallet.`
        );
        setNotificationCanClose(true);
        setModalTimer(5);
      }
    } catch (error) {
      setNotificationTitle(`Oops, something went wrong!`);
      setNotificationDesc((error as Error).message);
      setNotificationCanClose(true);
    }
    setTimeout(() => {
    closeAndResetModal();
    setNotificationCanClose(false);
    refreshItem();
}, 7000);
  }


  async function buyItemEscrow(): Promise<void> {
    setButtonLoading(true)
    try {
      if (wallet?.publicKey) {
        await buyOfferTxEscrow(
          endpoint,
          connection,
          wallet,
          getEscrowContract(endpoint).escrowProgram,
          escrowPubkeyStr,
          escrow.escrowTaxRecipient,
          escrow.taxAmount,
          price
        )

        await setMintsInWalletUnlisted([...mintsInWalletUnlisted, mint])
        await setListedMintsFromEscrow(
          listedMintsFromEscrow.filter((item: string) => item != mint)
        )

        tab.setSelectedId("fixed")

        setNotificationTitle(`Success!`)
        setNotificationDesc(successText)
        setNotificationCanClose(true)
        setModalTimer(5)
      }
    } catch (error) {
      setNotificationTitle(`Oops, something went wrong!`)
      setNotificationDesc((error as Error).message)
      setNotificationCanClose(true)
      // toast.error(<Notification title="Oops, something went wrong!" description={error.message} />);
    }
    setTimeout(() => {
      closeAndResetModal()
      setNotificationCanClose(false)
      refreshItem()
    }, 5000)
  }

  async function buyItem(): Promise<void> {
    setButtonLoading(true)
    try {
      if (wallet?.publicKey && nftData.saleInfo) {
        console.log(
          connection,
          wallet,
          nftData.saleInfo,
          DIRECT_SELL_TAX_ID,
          DIRECT_SELL_TAX_AMOUNT,
          price
        )
        await buyOfferTx(
          connection,
          wallet,
          nftData.saleInfo,
          DIRECT_SELL_TAX_ID,
          DIRECT_SELL_TAX_AMOUNT,
          price
        )

        await setMintsInWalletUnlisted([...mintsInWalletUnlisted, mint])
        await setListedMintsFromDirectSell(
          listedMintsFromDirectSell.filter((item: string) => item != mint)
        )

        setNotificationTitle(`Success!`)
        setNotificationDesc(successText)
        setNotificationCanClose(true)
        setModalTimer(5)
      }
    } catch (error) {
      setNotificationTitle(`Oops, something went wrong!`)
      setNotificationDesc((error as Error).message)
      setNotificationCanClose(true)
      // toast.error(<Notification title="Oops, something went wrong!" description={error.message} />);
    }
    setTimeout(() => {
      closeAndResetModal()
      setNotificationCanClose(false)
      refreshItem()
    }, 5000)
  }

  async function buyItemDutch(): Promise<void> {
    setButtonLoading(true)
    try {
      if (wallet?.publicKey && nftData.saleInfo) {
        await buyAuctionTx(
          connection,
          wallet,
          nftData.saleInfo,
          DUTCH_AUCTION_TAX_ID,
          DUTCH_AUCTION_TAX_AMOUNT,
          price
        )

        await setMintsInWalletUnlisted([...mintsInWalletUnlisted, mint])

        setNotificationTitle(`Success!`)
        setNotificationDesc(successText)
        setNotificationCanClose(true)
        setModalTimer(5)
      }
    } catch (error) {
      setNotificationTitle(`Oops, something went wrong!`)
      setNotificationDesc((error as Error).message)
      setNotificationCanClose(true)
      // toast.error(<Notification title="Oops, something went wrong!" description={error.message} />);
    }
    setTimeout(() => {
      closeAndResetModal()
      setNotificationCanClose(false)
      refreshItem()
    }, 5000)
  }

  async function cancelSell(): Promise<void> {
    setButtonLoading(true)
    try {
      if (wallet?.publicKey) {
        await cancelSellTx(connection, wallet, mint)

        await setMintsInWalletUnlisted([...mintsInWalletUnlisted, mint])
        await setListedMintsFromDirectSell(
          listedMintsFromDirectSell.filter((item: string) => item != mint)
        )
        setNotificationTitle(`Success!`)
        setNotificationDesc(successText)
        setNotificationCanClose(true)
        setModalTimer(5)
      }
    } catch (error) {
      setNotificationTitle(`Oops, something went wrong!`)
      setNotificationDesc((error as Error).message)
      setNotificationCanClose(true)
      // toast.error(<Notification title="Oops, something went wrong!" description={error.message} />);
    }
    setTimeout(() => {
      closeAndResetModal()
      setNotificationCanClose(false)
      refreshItem()
    }, 5000)
  }

  async function lowerOffer(): Promise<void> {
    setButtonLoading(true)
    try {
      if (wallet?.publicKey && nftData.saleInfo) {
        await lowerPrice(
          connection,
          wallet,
          mint,
          nftData.saleInfo,
          listingPrice
        )
        // listedMintsFromEscrow.splice(listedMintsFromEscrow.indexOf(mint), 1);
        // mintsInWalletUnlisted.push(mint);
        setMintPrice(listingPrice)
        setShowLowerPrice(false)
        setNotificationTitle(`Success!`)
        setNotificationDesc(
          `You've successfully lowered the price to ${listingPrice} SOL.`
        )
        setNotificationCanClose(true)
        setModalTimer(5)
      }
    } catch (error) {
      setNotificationTitle(`Oops, something went wrong!`)
      setNotificationDesc((error as Error).message)
      setNotificationCanClose(true)
      // toast.error(<Notification title="Oops, something went wrong!" description={error.message} />);
    }
    setTimeout(() => {
      closeAndResetModal()
      setNotificationCanClose(false)
      refreshItem()
    }, 5000)
  }

  async function cancelDutchAuction(): Promise<void> {
    setButtonLoading(true)
    try {
      if (wallet?.publicKey) {
        await cancelDutchAuctionTx(connection, wallet, mint)
        await setMintsInWalletUnlisted([...mintsInWalletUnlisted, mint])
        setNotificationTitle(`Auction Terminated`)
        setNotificationDesc(`This Auction is no longer live`)
        setNotificationCanClose(true)
        setModalTimer(5)
      }
    } catch (error) {
      setNotificationTitle(`Oops, something went wrong!`)
      setNotificationDesc((error as Error).message)
      setNotificationCanClose(true)
      // toast.error(<Notification title="Oops, something went wrong!" description={error.message} />);
    }
    setTimeout(() => {
      closeAndResetModal()
      setNotificationCanClose(false)
      refreshItem()
    }, 5000)
  }

  const videoFile =
    metadata?.properties?.files &&
    typeof metadata?.properties?.files !== "string"
      ? metadata?.properties?.files instanceof Array
        ? metadata?.properties?.files.find(
            (videoFile: any) =>
              videoFile.type && videoFile.type.includes("video")
          )
        : metadata?.properties?.files.type === "video/mp4" &&
          metadata?.properties?.files
      : null

  const videoFallback = (parentNode: any) => {
    console.log("videoFailed")

    setVideoFailed(true)
  }
  const category = metadata?.properties?.category

  const animationUrl = metadata?.animation_url
  const animationUrlExt = animationUrl
    ? animationUrl.includes("?ext=")
      ? animationUrl.split("?ext=").pop()
      : animationUrl.split(".").pop()
    : null


  const imageOutput =
    image && isImageInCache(image) && !cacheFailed ? (
      <IKImage
        urlEndpoint={IMAGE_KIT_ENDPOINT_URL}
        path={getImagePath(image)}
        transformation={[]}
        className="shadow-md w-full h-auto rounded-md"
        alt={name}
        onError={cacheFallback}
      />
    ) : (
      <img
        src={image}
        alt={name}
        className="shadow-md w-full h-auto rounded-md"
      />
    )

  const isSolo: boolean = collectionName.split("#")[0] == "solo"
  const anonDisplay: string | undefined = isSolo
    ? `Anon${shortenAddress(collectionName.split("#")[2])}`
    : undefined

  const viewProfile = () => {
    history.push(`${ROUTES.SOLOPROFILE}/${nftData.artistUser}`)
  }

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

      <div className="pt-16 sm:pt-12">
        <div className="relative text-center">
          <h5 className="text-gray-400 text-base mb-2 flex justify-center">
            <button
              disabled={isSolo && !nftData.artistUser}
              onClick={nftData.artistUser ? viewProfile : cancelAction}
              className={
                !(isSolo && !nftData.artistUser)
                  ? "hover:text-blue"
                  : "cursor-default"
              }
            >
              <div className="inline text-center col-span-2 flex flex-row">
                {" "}
                {nftData.artistUser
                  ? nftData.artistUser
                  : isSolo
                  ? anonDisplay
                  : collectionName}{" "}
                {nftData.artistVerified && <VerifiedCircle />}{" "}
              </div>
            </button>
          </h5>
          <h1 className="h1">{pageTitle}</h1>
          {nftData?.owner && pk && (
            <>
              <p className="m-2 text-gray-400 text-base">
                <a
                  className="hover:text-blue"
                  href={`${SOL_SCAN_BASE_URL}${nftData?.owner}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {domainNames
                    ? getDomainList(domainNames)
                    : shortenAddress(nftData?.owner)}
                </a>
              </p>
            </>
          )}
          <div className="flex justify-center mt-4">
            <button
              onClick={(e) => {
                setIsFavorite(handlerFavorites(e, nftData))
              }}
              className="flex items-center justify-end hover:text-white mx-2"
            >
              {isFavorite ? (
                <p className="inline-flex items-center text-xxs">
                  <HeartIconSolid className="text-red-400 h-4 w-4 mr-1 focus:outline-none" />
                  <span className="relative top-px text-white">Favorite</span>
                </p>
              ) : (
                <p className="inline-flex items-center text-xxs">
                  <HeartIconOutline className="text-gray-400 h-4 w-4 mr-1 focus:outline-none hover:text-red-400" />
                  <span className="relative top-px">Add to Favorites</span>
                </p>
              )}
            </button>
            <button
              className="flex items-center hover:text-white mx-2"
              onClick={(e) => {
                copyLink()
              }}
            >
              <span className="text-white self-start inline-flex items-center text-xxs">
                <ClipboardCopyIcon className="h-4 w-4 mr-1" />{" "}
                {copied ? "Copied :)" : "Copy Link"}
              </span>
            </button>
            <button
              className="flex items-center hover:text-white mx-2"
              onClick={refreshItem}
            >
              <span className="text-white self-start inline-flex items-center text-xxs">
                <RefreshIcon className="h-4 w-4 mr-1" /> Refresh
              </span>
            </button>
          </div>
          <div className="flex justify-center mt-4">
          {isVerified && collectionName != "unverifeyed" && !isSolo && <VerifeyedBadge/>}
          {!isVerified && collectionName == "unverifeyed" && !isSolo && <UnverifeyedBadge/>}
          {isDerivative && <DerivativeBadge/>}
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-5 md:gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="rounded-md overflow-hidden mb-4">
              {animationUrl &&
                (category === "vr" || animationUrlExt === "glb") && (
                  <div className="shadow-md w-full md:h-96 h-auto block">
                    <model-viewer
                      camera-controls
                      poster={image}
                      src={animationUrl}
                    ></model-viewer>
                  </div>
                )}
              {animationUrl &&
                (category === "html" || animationUrlExt === "html") && (
                  <HTMLContent animationUrl={animationUrl}></HTMLContent>
                )}
              {videoFile && !videoFailed && (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  controlsList="nodownload"
                  className="shadow-md w-full h-auto block"
                  onError={videoFallback}
                >
                  <source src={videoFile.uri} type="video/mp4" />
                  <source src={videoFile.uri} type="video/ogg" />
                </video>
              )}

              {animationUrl && animationUrlExt === "mp3" && (
                <>
                  {imageOutput}
                  <button
                    className="hover:text-white flex space-x-2 items-center py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      audio.trigger(animationUrl)
                    }}
                  >
                    <MusicNoteIcon className="h-4 w-4 group-hover:text-white transition 150 ease-in-out" />
                    <span>
                      {audio.isPlaying ? "Pause Audio" : "Play Audio"}
                    </span>
                  </button>
                </>
              )}

              {!animationUrl && (!videoFile || videoFailed) && imageOutput}
            </div>
            {isSolo && <VotingBar offer={nftData} />}
            <div className="my-5">
              <NFTDescriptionAccordion
                collectionDesc={collectionDesc}
                mint={mint}
              />
            </div>
          </div>
          <div className="col-span-1 md:col-span-3">
            {/* {nftData.escrowPubkeyStr && (
              <p className="text-gray-500 uppercase">Owned By: {ownedBy()}</p>
            )} */}

            {isTokenWithoutPK && (
              <>
                <div className="bg-gray-800 border-2 border-orange rounded-md w-full mb-8 mx-auto flex justify-between p-5">
                  <span className="text-orange">
                    <ExclamationCircleIcon className="w-10 mr-4" />
                  </span>
                  <p className="text-white font-semibold">
                    This item is a token, please go back to the collection page
                    and make a selection if you want to purchase.
                  </p>
                </div>
                <button onClick={() => cancelAction()} className="btn mb-8">
                  Back to Collection
                </button>
              </>
            )}

            {nftData && !isTokenWithoutPK && (
              <div className="grid grid-cols-2">
                {nftData.price && isListed && (
                  <div className="col-span-1">
                    <p className="text-base text-gray-500 uppercase mb-2">
                      Current Price:
                    </p>
                    {nftData.price != listingPrice}
                    <p className="text-3xl font-bold text-white mb-6">
                      ◎{mintPrice}
                    </p>
                  </div>
                )}
                {nftData.lastPrice && (
                  <div className="col-span-1">
                    <p className="text-base text-gray-500 uppercase mb-2">
                      Last Sold:
                    </p>
                    <p className="text-3xl font-bold text-white mb-6">
                      ◎{nftData.lastPrice}
                    </p>
                  </div>
                )}
                {nftData.reservedPrice && nftData.reservedPrice/LAMPORTS_PER_SOL != nftData.price && (
                  <div className="col-span-2">
                    <p className="text-base text-gray-500 uppercase mb-2">Price Reduced in:</p>
                    <div className="mb-6">
                    <DutchCountdown
                    timeLeft={timeLeftonPrice}
                    refreshItem={refreshItem}
                    />
                    </div>
                  </div>
                )}
                {isOwnedByWallet && nftData.reservedPrice && nftData.reservedPrice/LAMPORTS_PER_SOL == nftData.price && (
                  <div className="col-span-2">
                  <span className="text-orange">
                    <ExclamationCircleIcon className="w-10 mr-4 inline" />
                  </span>
                    <p className="text-white font-light inline">Dutch Auction on this item has reached it's Reserve price</p>
                    <div className="mb-6">

                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="">
              {displayCopyBanner && (
                <BottomBanner setDisplayCopyBanner={setDisplayCopyBanner} />
              )}

              <div className="">
                <div className="space-y-2 md:space-y-8">
                  <div className="w-full">
                    {!isVerifeyed ||
                      (collectionName == "unverifeyed" && (
                        <div  className="hidden bg-gray-800 border-2 border-orange rounded-md w-full mb-8 mx-auto flex justify-between p-5">
                          <span className="text-orange">
                            <ExclamationCircleIcon className="w-10 mr-4" />
                          </span>
                          <p className="text-white font-semibold">
                            This NFT cannot be authenticated against any official mint hash lists supplied to DigitalEyes. Buyers please exercise additional caution.
                          </p>
                        </div>
                      ))}

                    {notice != "" && (
                      <div className="bg-gray-800 border-2 border-orange rounded-md w-full mb-8 mx-auto flex justify-between p-5">
                        <span className="text-orange">
                          <ExclamationCircleIcon className="w-10 mr-4" />
                        </span>
                        <p className="text-white font-semibold">{notice}</p>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <div>
                        {disputedMessage && (
                          <p className="text-orange text-sm font-bold my-2">
                            {disputedMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {children}
                </div>

                {!wallet?.publicKey && (
                  <div className="mb-5">
                    <ConnectButton size="lg" />
                  </div>
                )}

                {/*
                  {`isListed: ${isListed} `}<br/>
                  {`isOwnedByWallet: ${isOwnedByWallet} `}<br/>
                  {`isEscrowListing: ${isEscrowListing} `}<br/>
                  {`statusOnChain: ${statusOnchain}`}
                  */}

                {nftData && !isTokenWithoutPK && (
                  <div className="flex space-x-2">
                    {isListed &&
                      !isOwnedByWallet &&
                      !isEscrowListing &&
                      wallet?.publicKey && (
                        <div className="mb-8">
                          <TooltipReference {...tooltipConnectWallet}>
                            <button
                              type="button"
                              disabled={
                                notice || isNoticeLoading ? true : false
                              }
                              className="btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                              onClick={() => buyItem()}
                            >
                              {buttonText}
                            </button>
                          </TooltipReference>
                        </div>
                      )}

                    {isListed && isEscrowListing && !nftData.reservedPrice && (
                      <div className="mb-8">
                        <TooltipReference {...tooltipConnectWallet}>
                          <button
                            type="button"
                            disabled={
                              !wallet?.publicKey || notice || isNoticeLoading
                                ? true
                                : false
                            }
                            className="btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            onClick={() => buyItemEscrow()}
                          >
                            {nftData.owner === wallet?.publicKey?.toString()
                              ? `Unlist Now`
                              : buttonText}
                          </button>
                        </TooltipReference>
                      </div>
                    )}

                    {wallet?.publicKey && isListed && !isOwnedByWallet && nftData.reservedPrice && (
                      <div className="mb-8">
                      <button
                        type="button"
                        disabled={!wallet?.publicKey || notice || isNoticeLoading ? true : false}
                        className="btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        onClick={() => buyItemDutch()}
                      >
                        {buttonText}
                      </button>
                      </div>
                    )
                    }


                    {isListed && isOwnedByWallet && nftData.reservedPrice && (
                      <div className="mb-8">
                      <button
                        type="button"
                        disabled={!wallet?.publicKey || notice || isNoticeLoading ? true : false}
                        className="btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        onClick={() => cancelDutchAuction()}
                      >
                        Cancel Dutch Auction & Unlist
                      </button>
                      </div>
                    )

                    }



                    {!isOwnedByWallet && wallet?.publicKey && (
                      <div className="mb-8">
                        <Link to={`${ROUTES.INBOX}/${nftData?.owner}`}>
                          <button
                            type="button"
                            className="btn btn-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Message owner
                          </button>
                        </Link>
                      </div>
                    )}

                    {((statusOnchain == "listed" && !isListed) ||
                      (isListed && isOwnedByWallet && !isEscrowListing)) && (
                      <div
                        className={`flex space-x-2 mb-6 ${
                          isToken && tokensUnlisted < 1 ? "hidden" : ""
                        }`}
                      >
                        <TooltipReference {...tooltipConnectWallet}>
                          <button
                            type="button"
                            disabled={
                              !wallet?.publicKey || notice || isNoticeLoading
                                ? true
                                : false
                            }
                            className="btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            onClick={() => cancelSell()}
                          >
                            Unlist Item
                          </button>
                        </TooltipReference>

                        <button
                          type="button"
                          disabled={
                            !wallet?.publicKey || notice || isNoticeLoading
                              ? true
                              : false
                          }
                          className="btn btn-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          onClick={() => setShowLowerPrice(!showLowerPrice)}
                        >
                          Lower Item Price
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {showLowerPrice && (
                  <div className="mb-6 pb-5">
                    <div className="">
                      <div className="relative">
                        <label className="text-xxs text-white font-light">
                          Price (sol)
                        </label>
                        <input
                          onChange={(e) => {
                            handleListingPriceChange(e)
                          }}
                          value={listingPrice || ""}
                          type="number"
                          name="price"
                          min="0"
                          id="price"
                          className="block w-auto border border-gray-600 bg-transparent rounded-md text-gray-500 focus:text-white px-4 py-3 mb-2 focus:outline-none font-light"
                          placeholder="Amount"
                          aria-describedby="price-currency"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                        />
                      </div>
                    </div>

                    <NftRoyaltyCalculator
                      offer={nftData}
                      listingPrice={listingPrice}
                    />

                    <button
                      type="button"
                      disabled={
                        !wallet?.publicKey || listingPrice <= 0 ? true : false
                      }
                      className="btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      onClick={() => lowerOffer()}
                    >
                      {listingPrice > 0
                        ? `Change Price to ${listingPrice}`
                        : `Enter Lower Price`}
                    </button>
                  </div>
                )}

                {!isListed && isOwnedByWallet && statusOnchain != "listed" && (
                  <div
                    className={`w-full mb-12 ${
                      isToken && tokensUnlisted < 1 ? "hidden" : ""
                    }`}
                  >
                    <TabList {...tab} aria-label="My tabs">
                      <Tab
                        {...tab}
                        id="fixed"
                        style={{
                          color: "white",
                          background: `${tab.selectedId === "fixed" ? "#222" : "#444"}`,
                          padding: "1rem 2rem",
                          marginRight: "5px",
                          borderRadius: "5px 5px 0 0",
                        }}
                      >
                        Fixed Price
                      </Tab>
                      <Tab
                        id="dutch"
                        {...tab}
                        style={{
                          color: "white",
                          background: `${tab.selectedId === "dutch" ? "#222" : "#444"}`,
                          padding: "1rem",
                          borderRadius: "5px 5px 0 0",
                        }}
                      >
                        Dutch Auction
                      </Tab>
                    </TabList>
                    <TabPanel
                      {...tab}
                      tabId="fixed"
                      style={{
                        color: "white",
                        background: "#222",
                        padding: "2rem",
                        borderRadius: "0 5px 5px 5px",
                        margin: "0",
                      }}
                    >
                      <>
                        <div className="mb-5">
                          <div className="">
                            <div className="relative">
                              <label className="text-xxs text-white font-light">
                                Price (sol)
                              </label>
                              <input
                                onChange={(e) => {
                                  handleListingPriceChange(e)
                                }}
                                value={listingPrice || ""}
                                type="number"
                                name="price"
                                min="0"
                                id="price"
                                className="block w-auto border border-gray-600 bg-transparent rounded-md text-gray-500 focus:text-white px-4 py-3 focus:outline-none font-light"
                                placeholder="Amount"
                                aria-describedby="price-currency"
                                onWheel={(e) =>
                                  (e.target as HTMLElement).blur()
                                }
                              />
                            </div>
                          </div>

                          <NftRoyaltyCalculator
                            offer={nftData}
                            listingPrice={listingPrice}
                          />
                        </div>

                        <TooltipReference {...tooltipConnectWallet}>
                          <button
                            type="button"
                            disabled={
                              !wallet?.publicKey || listingPrice <= 0
                                ? true
                                : false
                            }
                            className="btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            onClick={() => listOffer()}
                          >
                            {listingPrice > 0
                              ? `List this NFT for ${listingPrice} SOL`
                              : "Enter Price to List"}
                          </button>
                        </TooltipReference>
                        {!!customContract && (
                          <div className="bg-gray-800 mt-5 border-2 border-blue rounded-md w-full mb-8 mx-auto flex justify-between p-5">
                            <span className="text-blue">
                              <TerminalIcon className="w-10 mr-4" />
                            </span>
                            <p className="text-white font-semibold">
                              Please note this is an escrow contract and listing
                              this item will move it out of your wallet.
                            </p>
                          </div>
                        )}
                      </>
                    </TabPanel>
                    <TabPanel
                      {...tab}
                      tabId="dutch"
                      style={{
                        color: "white",
                        background: "#222",
                        padding: "2rem",
                        borderRadius: "0 5px 5px 5px",
                        margin: "0",
                      }}
                    >
                      <>
                        <div className="mb-5">
                          <div className="grid grid-cols-2 mb-5 gap-x-5">
                            <div className="relative">
                              <label className="text-xxs text-white font-light">
                                Starting Price (sol)
                              </label>
                              <input
                                onChange={(e) => {
                                  handleDutchStartPriceChange(e);
                                }}
                                value={dutchStartPrice || ""}
                                type="number"
                                name="dutchStartingPrice"
                                min="0"
                                id="price"
                                className="block w-full border border-gray-600 bg-transparent rounded-md text-gray-500 focus:text-white px-4 py-3 focus:outline-none font-light"
                                placeholder="Amount"
                                aria-describedby="price-currency"
                                onWheel={(e) => (e.target as HTMLElement).blur()}
                              />
                            </div>
                            <div className="relative">
                              <label className="text-xxs text-white font-light">
                                Reserve Price (sol)
                              </label>
                              <input
                                onChange={(e) => {
                                  handleDutchReservePriceChange(e)
                                }}
                                value={dutchReservePrice || ""}
                                type="number"
                                name="dutchReservePrice"
                                min="0"
                                max={dutchStartPrice}
                                id="price"
                                className="block w-full border border-gray-600 bg-transparent rounded-md text-gray-500 focus:text-white px-4 py-3 focus:outline-none font-light"
                                placeholder="Amount"
                                aria-describedby="price-currency"
                                onWheel={(e) => (e.target as HTMLElement).blur()}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 mb-5 gap-x-5">
                            <div className="relative">
                              <label className="text-xxs text-white font-light">Duration</label>
                                <StyledSelect
                                  options={[
                                    {
                                      value: "1-day",
                                      label: "1 day",
                                    },
                                    {
                                      value: "3-day",
                                      label: "3 day",
                                    },
                                    {
                                      value: "7-day",
                                      label: "7 day",
                                    },
                                    {
                                      value: "custom",
                                      label: "Custom",
                                    },
                                    {
                                      value: "advanced",
                                      label: "Advanced",
                                    }
                                  ]}
                                  onChange={(selectedFilter: { value: any; label: string }, action:any) => {
                                    setDutchDuration( selectedFilter.value );

                                  }}
                                  placeholder="Select Duration"
                                  isClearable={false}
                                  className="input-select"
                                />
                            </div>
                            {dutchDuration == 'custom' && (
                            <>
                              <div className="relative">
                                <label className="text-xxs text-white font-light">
                                  Custom Duration
                                </label>
                                <div className="flex items-center justify-between gap-x-2">
                                  <input
                                    onChange={(e) => {
                                      handleDutchCustomDurationDaysChange(e);
                                    }}
                                    value={dutchCustomDurationDays || ""}
                                    type="number"
                                    name="dutchCustomDurationDays"
                                    min="0"
                                    step="1"
                                    id="days"
                                    className="block w-full border border-gray-600 bg-transparent rounded-md text-gray-500 focus:text-white px-4 py-3 focus:outline-none font-light"
                                    placeholder="Days"
                                    aria-describedby="price-currency"
                                    onWheel={(e) => (e.target as HTMLElement).blur()}
                                  />
                                  :
                                  <input
                                  onChange={(e) => {
                                    handleDutchCustomDurationHoursChange(e);
                                  }}
                                  value={dutchCustomDurationHours || ""}
                                  type="number"
                                  name="dutchCustomDurationHours"
                                  min="0"
                                  max="23"
                                  step="1"
                                  id="hours"
                                  className="block w-full border border-gray-600 bg-transparent rounded-md text-gray-500 focus:text-white px-4 py-3 focus:outline-none font-light"
                                  placeholder="Hours"
                                  aria-describedby="price-currency"
                                  onWheel={(e) => (e.target as HTMLElement).blur()}
                                  />
                                </div>
                              </div>
                          </>
                          )}
                          </div>

                          { (dutchDuration == 'custom' && (dutchCustomDurationDays > 0 || dutchCustomDurationHours > 0)) && listingNotice=='' &&
                              <small className="mb-5 block">
                                This auction will last {dutchCustomDurationDays} day(s) and {dutchCustomDurationHours} hour(s).
                              </small>
                          }

                          { dutchDuration == 'advanced' && (
                            <>
                              <Divider rounded={true}/>
                              <div className="grid grid-cols-2 my-5 gap-x-5">
                              <div className="relative">
                                <label className="text-xxs text-white font-light">
                                  Adjustment Interval
                                </label>
                                <div className="flex items-center justify-between gap-x-2">
                                  <input
                                    onChange={(e) => {
                                      handleDutchDurationCustomIntervalHoursChange(e);
                                    }}
                                    value={dutchDurationCustomIntervalHours || ""}
                                    type="number"
                                    name="dutchDurationCustomIntervalHours"
                                    min="0"
                                    max="24"
                                    id="hours"
                                    className="block w-full border border-gray-600 bg-transparent rounded-md text-gray-500 focus:text-white px-4 py-3 focus:outline-none font-light"
                                    placeholder="Hours"
                                    onWheel={(e) => (e.target as HTMLElement).blur()}
                                  />
                                  :
                                  <input
                                  onChange={(e) => {
                                    handleDutchDurationCustomIntervalMinsChange(e);
                                  }}
                                  value={dutchDurationCustomIntervalMins || ""}
                                  type="number"
                                  name="dutchDurationCustomIntervalMins"
                                  min="0"
                                  max="59"
                                  id="minutes"
                                  className="block w-full border border-gray-600 bg-transparent rounded-md text-gray-500 focus:text-white px-4 py-3 focus:outline-none font-light"
                                  placeholder="Minutes"
                                  onWheel={(e) => (e.target as HTMLElement).blur()}
                                  />
                                </div>
                              </div>
                              <div className="relative">
                                <label className="text-xxs text-white font-light">
                                  Price Change Per Interval (sol)
                                </label>
                                <input
                                  onChange={(e) => {
                                    handleDutchIntervalCustomPriceChange(e);
                                  }}
                                  value={dutchIntervalCustomPrice || ""}
                                  type="number"
                                  name="dutchIntervalCustomPrice"
                                  min="0"
                                  id="price"
                                  className="block w-full border border-gray-600 bg-transparent rounded-md text-gray-500 focus:text-white px-4 py-3 focus:outline-none font-light"
                                  placeholder="Amount"
                                  aria-describedby="price-currency"
                                  onWheel={(e) => (e.target as HTMLElement).blur()}
                                />
                              </div>
                            </div>
                              { (dutchIntervalCustomPrice > 0 && (dutchDurationCustomIntervalHours > 0 || dutchDurationCustomIntervalMins > 0)) ?? (
                                <small className="mb-5 block">
                                  This item will lower by ◎{dutchIntervalCustomPrice} every {dutchDurationCustomIntervalHours} hours and {dutchDurationCustomIntervalMins} minutes.
                                </small>
                              )}
                            </>
                          )}
                          <NftRoyaltyCalculator offer={nftData} listingPrice={dutchReservePrice} />
                          {!!dutchReservePrice &&
                            <p className="text-xs text-white opacity-90 mb-4">Above calculations are based on your Reserve price</p>}

                          { listingNotice != '' && (
                            <div className="bg-gray-800 border-2 border-orange rounded-md w-full mx-auto p-4 text-xs mb-4">
                              <p className="text-white font-semibold">{listingNotice}</p>
                            </div>
                          )}

                          { (dutchDuration == '1-day' || dutchDuration == '3-day' || dutchDuration == '7-day') && (
                            <TooltipReference {...tooltipConnectWallet}>
                              <button
                                type="button"
                                disabled={!wallet?.publicKey || listingNotice != '' || (dutchStartPrice == 0 || dutchReservePrice == 0 ) ? true : false}
                                className="btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                onClick={() => listOfferDutch()}
                              >
                                {dutchStartPrice > 0
                                  ? `Begin auction at ◎${dutchStartPrice} SOL for ${dutchDuration}`
                                  : "Enter Price to List"}
                              </button>
                            </TooltipReference>
                          )}

                          { (dutchDuration == 'custom') && (

                            <TooltipReference {...tooltipConnectWallet}>
                              <button
                                type="button"
                                disabled={
                                  !wallet?.publicKey ||
                                  listingNotice != '' ||
                                  (dutchStartPrice <= 0) ||
                                  (dutchReservePrice <= 0) ||
                                  (dutchCustomDurationDays == 0 && dutchCustomDurationHours == 0) ?
                                  true :
                                  false
                                }
                                className="btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                onClick={() => listOfferDutch()}
                              >
                                {(dutchStartPrice > 0)
                                  ? `Begin auction at ◎${dutchStartPrice} SOL`
                                  : "Enter Price to List"}
                              </button>
                            </TooltipReference>
                          )}

                          { (dutchDuration == 'advanced') && (
                            <TooltipReference {...tooltipConnectWallet}>
                              <button
                                type="button"
                                disabled={
                                  !wallet?.publicKey ||
                                  listingNotice != '' ||
                                  (dutchStartPrice <= 0) ||
                                  (dutchReservePrice <= 0) ||
                                  !dutchDurationCustomInterval ||
                                  !dutchIntervalCustomPrice ?
                                  true :
                                  false
                                }
                                className="btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                onClick={() => listOfferDutch()}
                              >
                                {(dutchStartPrice > 0)
                                  ? `Begin auction at ◎${dutchStartPrice} SOL with ◎${dutchIntervalCustomPrice} decrements`
                                  : "Enter Price to List"}
                              </button>
                            </TooltipReference>
                          )}

                        </div>

                      </>
                    </TabPanel>
                  </div>
                )}

                {offersByOwner.length >= 1 &&
                  (!pk || pk === "undefined" || fromWallet) && (
                    <>
                      <div className="w-full mb-4">
                        <div className="text-white text-lg uppercase text-left">
                          Tokens Currently Listed
                        </div>
                        {offersByOwner.map((offer: any) => (
                          <div className="offer-list-item">
                            <a
                              className="flex justify-between items-center w-full py-2 text-blue"
                              href={`${window.location.origin}${ROUTES.ITEM}/${offer.collectionName}/${offer.mint}?pk=${offer.pk}`}
                              target="_blank"
                            >
                              <span>
                                Listed On:{" "}
                                {dayjs(offer.addEpoch * 1000).format("MMMM DD")}{" "}
                                (click to view)
                              </span>
                              <span>
                                ◎
                                {kFormatter(
                                  (offer.price as number) / LAMPORTS_PER_SOL
                                )}
                              </span>
                            </a>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                <div className="mb-5">
                  <Divider rounded={true} />
                </div>
                <Attributes
                  data={metadata?.attributes}
                  mint={mint}
                  collection={collectionName}
                />
                <NFTDetailsAccordion salesHistoryData={salesHistory} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tooltip
        {...tooltipConnectWallet}
        style={{
          background: "none",
          display: !wallet?.publicKey ? "block" : "none",
        }}
      >
        <div className="bg-black text-xs p-2 rounded-md">
          <TooltipArrow {...tooltipConnectWallet} />
          Please connect your wallet
        </div>
      </Tooltip>

      <NotificationModal
        isShow={buttonLoading}
        isToast={false}
        title={notificationTitle}
        description={notificationDesc}
        timer={modalTimer}
        onBackDropClick={() => {
          if (notificationCanClose) {
            closeAndResetModal()
          }
        }}
      ></NotificationModal>
    </div>
  )
}
