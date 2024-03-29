import { ethers } from "ethers";
import {
  getRoundById,
  getProjectsApplications,
  fetchMatchingDistribution,
  getRoundInfo,
  fetchPayoutTokenPrice,
  getRoundsByChainId,
} from "../../../api/round";
import {
  MatchingStatsData,
  PayoutToken,
  ProjectApplication,
  Round,
  RoundInfo,
} from "../../../api/types";
import {
  ChainId,
  defaultIntro,
  payoutTokens,
  sortByMatchAmount,
} from "../../../api/utils";
import RoundPage from "./round-page";
import { Address } from "viem";
import type { Metadata, ResolvingMetadata } from "next";
import { PAGE_DESCRIPTION } from "../../../constants";
import { revalidateTag } from "next/cache";

export interface GrantPageProps {
  params: { chainId: string; roundId: string };
  searchParams: { search: string | undefined };
}

async function getData(chainId: number, roundId: Address) {
  let roundData: Round | undefined = undefined,
    roundInfo: RoundInfo | undefined = undefined,
    applications:
      | (ProjectApplication & { matchingData?: MatchingStatsData })[]
      | undefined = undefined,
    allRoundsList: Round[] | undefined = undefined,
    payoutTxnHash: string | undefined = undefined;

  try {
    const { data, allRounds } = await getRoundById(chainId, roundId);
    allRoundsList = allRounds;
    if (!data?.metadata?.quadraticFundingConfig?.matchingFundsAvailable)
      throw new Error("No round metadata");
    const matchingFundPayoutToken: PayoutToken = payoutTokens.filter(
      (t) =>
        t.address.toLowerCase() == data?.token.toLowerCase() &&
        t.chainId == chainId
    )[0];
    const tokenAmount = parseFloat(
      ethers.utils.formatUnits(
        data.matchAmount,
        matchingFundPayoutToken.decimal
      )
    );

    // get payout token price
    const signerOrProvider =
      chainId == ChainId.PGN
        ? new ethers.providers.JsonRpcProvider(
            "https://rpc.publicgoods.network",
            chainId
          )
        : chainId == ChainId.FANTOM_MAINNET_CHAIN_ID
        ? new ethers.providers.JsonRpcProvider(
            "https://rpcapi.fantom.network/",
            chainId
          )
        : chainId == ChainId.BASE
        ? new ethers.providers.JsonRpcProvider("https://1rpc.io/base", chainId)
        : chainId == ChainId.ZKSYNC_ERA_MAINNET_CHAIN_ID
        ? new ethers.providers.JsonRpcProvider(
            "https://mainnet.era.zksync.io",
            chainId
          )
        : new ethers.providers.InfuraProvider(
            chainId,
            process.env.NEXT_PUBLIC_INFURA_API_KEY
          );

    const price = await fetchPayoutTokenPrice(
      roundId,
      signerOrProvider,
      matchingFundPayoutToken,
      data.updatedAtBlock
    );
    const isDirectGrant =
      !data.metadata?.quadraticFundingConfig?.matchingFundsAvailable;
    const rate = price ? price : data.matchAmountUSD / tokenAmount;
    const matchingPoolUSD =
      data.metadata?.quadraticFundingConfig?.matchingFundsAvailable * rate;

    roundData = { ...data, matchingPoolUSD, rate, matchingFundPayoutToken };

    // matching data
    const matchingData = await fetchMatchingDistribution(
      roundId,
      signerOrProvider,
      roundData.matchingFundPayoutToken,
      roundData.matchingPoolUSD
    );
    payoutTxnHash = matchingData?.payoutTxnHash;
    // applications data
    applications = await getProjectsApplications(roundId, chainId);
    if (!applications) throw new Error("No applications");
    applications = applications?.map((app) => {
      const projectMatchingData = matchingData?.matchingDistribution?.find(
        (data) => data.projectId == app.projectId
      );
      return {
        ...app,
        matchingData: projectMatchingData,
      };
    });
    applications = sortByMatchAmount(applications || []);

    // ipfs round data
    const {
      data: roundInfoData,
      error: roundInfoErr,
      success: roundInfoSuccess,
    } = await getRoundInfo(roundId);
    if (!roundInfoSuccess) throw new Error(roundInfoErr);
    const formattedRoundInfo = roundInfoData?.preamble
      ? {
          ...roundInfoData,
          preamble: roundInfoData.preamble
            .replace(/<\/?p[^>]*>/g, "")
            .replaceAll("<br>", "\n"),
        }
      : roundInfoData;
    roundInfo = formattedRoundInfo;
  } catch (err) {
    console.log(err);
  }
  return {
    roundData,
    roundInfo,
    applications,
    allRounds: allRoundsList,
    payoutTxnHash,
  };
}

export async function generateMetadata(
  { params }: GrantPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // read route params
  const roundId = params.roundId;
  const chainId = params.chainId;

  // fetch data
  const { roundData, roundInfo } = await getData(
    Number(chainId),
    roundId as Address
  );
  const ogTitle = roundData?.metadata?.name
    ? `${roundData?.metadata?.name} | Gitcoin Round Report Card`
    : `Gitcoin Round Report Cards`;
  const ogDescription =
    !roundInfo?.preamble || roundInfo?.preamble == defaultIntro
      ? PAGE_DESCRIPTION
      : `${roundInfo.preamble.slice(0, 150)}...`;

  return {
    title: roundData?.metadata?.name,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: "https://reportcards.gitcoin.co/",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
    },
  };
}

export default async function Page({
  params: { chainId, roundId },
  searchParams: { search },
}: GrantPageProps) {
  const { roundData, roundInfo, applications, allRounds, payoutTxnHash } =
    await getData(Number(chainId), roundId as Address);
  const searchedRoundsListData = search
    ? await getRoundsByChainId(Number(search))
    : undefined;

  const refetchRoundInfo = async () => {
    "use server";
    // await revalidateTag("roundInfo");
    await getRoundInfo(roundId);
  };
  return (
    <RoundPage
      roundData={roundData!}
      applications={applications!}
      roundInfo={roundInfo!}
      chainId={Number(chainId)}
      roundId={roundId}
      refetchRoundInfo={refetchRoundInfo}
      allRounds={searchedRoundsListData?.data || allRounds!}
      payoutTxnHash={payoutTxnHash}
    />
  );
}
