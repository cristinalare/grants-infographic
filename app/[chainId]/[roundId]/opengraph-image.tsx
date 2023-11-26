import { GrantPageProps } from "./page";
import { Address, getAddress } from "viem";
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import {
  ApplicationStatus,
  MatchingStatsData,
  PayoutToken,
  ProjectApplication,
  Round,
} from "../../../api/types";
import { ChainId, formatAmount, payoutTokens } from "../../../api/utils";
import { ethers } from "ethers";
import { ImageResponse } from "next/server";
import {
  fetchPayoutTokenPrice,
  getProjectsApplications,
  getRoundById,
} from "../../../api/round";
dayjs.extend(LocalizedFormat);

export const runtime = "nodejs";

async function getData(chainId: number, roundId: Address) {
  let roundData: Round | undefined = undefined,
    tokenAmount = 0,
    applications:
      | (ProjectApplication & { matchingData?: MatchingStatsData })[]
      | undefined = undefined;

  try {
    const { data } = await getRoundById(chainId, roundId);

    if (!data?.metadata?.quadraticFundingConfig?.matchingFundsAvailable)
      throw new Error("No round metadata");
    const matchingFundPayoutToken: PayoutToken = payoutTokens.filter(
      (t) => t.address.toLowerCase() == data?.token.toLowerCase()
    )[0];
    tokenAmount = parseFloat(
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
        : new ethers.providers.InfuraProvider(
            chainId,
            process.env.NEXT_PUBLIC_INFURA_API_KEY
          );

    const price = await fetchPayoutTokenPrice(
      roundId,
      signerOrProvider,
      matchingFundPayoutToken
    );
    const rate = price ? price : data.matchAmountUSD / tokenAmount;
    const matchingPoolUSD =
      data.metadata?.quadraticFundingConfig?.matchingFundsAvailable * rate;

    roundData = { ...data, matchingPoolUSD, rate, matchingFundPayoutToken };

    // applications data
    applications = await getProjectsApplications(roundId, chainId);
    if (!applications) throw new Error("No applications");
  } catch (err) {
    console.log(err);
  }
  return { roundData, applications, tokenAmount };
}

export default async function GET(params: GrantPageProps) {
  // const { roundData, applications, tokenAmount } = await getData(
  //   Number(params.params.chainId),
  //   params.params.roundId as Address
  // );

  // const matchingCapPercent =
  //   roundData?.metadata?.quadraticFundingConfig?.matchingCapAmount || 0;
  // const matchingCapTokenValue =
  //   ((tokenAmount || 0) * (matchingCapPercent || 0)) / 100;
  // const projectsReachedMachingCap: number =
  //   applications?.filter(
  //     (application) =>
  //       application.matchingData?.matchAmount! >= matchingCapTokenValue
  //   )?.length || 0;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFDED",
          fontSize: 20,
          fontWeight: 600,
          padding: "20px",
        }}
      >
        {/* <svg
          style={{ position: "absolute" }}
          width="1440"
          height="764"
          viewBox="0 0 1440 764"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g opacity="0.15">
            <mask
              id="mask0_26_59"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1440"
              height="764"
            >
              <rect width="1440" height="764" fill="#FFFDED" />
            </mask>
            <g mask="url(#mask0_26_59)">
              <path
                d="M753.549 -650.5C775.867 -623.701 795.198 -594.414 810.962 -563.301C817.019 -551.312 822.702 -538.618 822.827 -525.177C822.951 -512.192 817.849 -499.789 813.949 -487.426C805.155 -459.383 802.168 -429.515 805.238 -400.31C807.187 -381.891 811.502 -363.057 806.731 -345.178C799.803 -319.25 775.742 -301.951 752.179 -289.133C728.617 -276.356 702.814 -264.989 686.759 -243.501C684.187 -240.099 681.906 -236.324 681.117 -232.134C680.246 -227.446 681.325 -222.634 681.408 -217.822C681.615 -201.768 668.257 -186.667 652.328 -184.884C646.81 -184.261 640.878 -184.967 635.983 -182.312C626.524 -177.209 626.939 -163.851 623.496 -153.646C618.601 -139.127 604.662 -129.917 594.955 -118.053C585.248 -106.189 581.141 -85.7369 594.001 -77.3987C606.571 -69.2677 622.5 -80.0121 633.494 -90.1342C644.28 -100.09 655.065 -110.047 665.851 -120.003C674.729 -128.175 688.17 -136.721 697.628 -129.212C705.261 -123.155 703.602 -111.125 699.578 -102.289C692.028 -85.8199 678.462 -72.2132 661.993 -64.5801C656.434 -62.0081 650.461 -60.0583 645.566 -56.3662C630.673 -45.2485 630.465 -23.2206 633.12 -4.80161C635.775 13.6172 639.385 34.1933 628.599 49.335C639.841 56.6362 652.784 63.6055 665.976 61.1164C679.126 58.5859 689.373 41.536 680.744 31.2895C677.799 27.7633 673.194 25.6476 671.12 21.5407C666.805 12.995 676.181 3.91 685.017 0.217927C693.853 -3.47415 704.68 -6.95877 707.128 -16.2097C709.119 -23.8428 704.058 -32.264 706.92 -39.6067C711.608 -51.72 729.654 -47.8205 741.145 -41.8053C742.555 -60.0583 748.28 -83.1649 766.45 -85.488C770.93 -86.0687 775.659 -85.1146 779.932 -86.6495C787.441 -89.346 790.345 -98.0576 794.327 -104.944C798.351 -111.83 807.893 -117.763 813.659 -112.287C816.314 -109.756 816.853 -105.815 817.06 -102.165C818.595 -71.4664 803.08 -40.4779 777.568 -23.345C771.594 -19.321 765.04 -15.9608 760.144 -10.6509C748.695 1.83579 749.69 20.8355 748.155 37.7195C744.671 75.9262 723.929 112.266 692.774 134.668C690.119 158.147 657.43 164.121 633.826 163.043C610.221 161.964 578.942 166.403 575.25 189.758C573.466 200.959 579.44 213.529 573.632 223.277C570.438 228.629 564.464 231.533 559.113 234.685C527.046 253.768 508.834 293.676 515.472 330.348C518.998 349.804 528.622 370.214 520.74 388.342C516.467 398.174 507.673 405.309 502.363 414.643C497.053 423.977 497.136 438.372 506.885 442.811C511.282 444.802 516.592 444.221 520.906 446.461C529.742 451.066 528.995 463.594 531.111 473.343C534.845 490.559 552.724 503.502 570.231 501.593C587.737 499.685 602.464 483.258 602.422 465.627C602.422 458.948 600.597 452.02 603.003 445.798C609.599 429.038 634.406 435.966 652.12 432.813C668.174 429.951 681.242 415.016 681.906 398.713C682.362 387.098 677.259 375.524 679.334 364.074C680.827 356.068 685.639 349.181 690.368 342.544C706.215 320.35 722.021 298.156 737.867 276.004C741.85 270.403 746.04 264.347 746.206 257.46C746.372 251.155 743.136 245.264 742.389 239.041C740.896 227.094 748.363 216.018 755.457 206.269C767.114 190.256 788.685 172.667 803.744 185.527C809.676 190.629 811.668 198.843 812.829 206.559C821.167 261.982 803.08 320.806 765.04 361.958C760.393 366.978 755.125 372.62 755.54 379.465C755.83 384.775 759.605 389.255 760.974 394.44C767.031 416.842 730.483 427.088 723.182 449.158C719.075 461.561 725.298 474.836 731.354 486.452C737.37 497.984 743.841 510.056 754.71 517.233C765.579 524.41 782.214 524.659 790.013 514.205C803.039 496.698 785.574 462.018 806.067 454.509C821.043 455.297 834.11 469.236 833.986 484.212C842.075 487.572 848.92 476.745 849.418 467.95C849.916 459.197 849.128 448.577 856.387 443.682C866.343 437.003 879.286 450.153 878.996 462.142C878.706 474.131 871.529 484.875 869.33 496.698C867.132 508.521 873.935 524.078 885.882 522.875C898.825 521.547 901.273 504.124 901.854 491.14C902.434 478.155 911.395 461.022 923.342 466.125C928.321 468.24 930.934 473.633 934.709 477.491C948.689 491.762 975.82 479.648 981.254 460.4C986.688 441.151 976.815 420.824 964.204 405.309C951.552 389.794 935.788 376.644 925.997 359.22C922.637 353.247 920.024 346.817 916.539 340.926C912.183 333.542 906.458 327.07 902.02 319.769C890.197 300.23 888.413 274.966 897.456 253.976C898.452 251.694 899.655 249.329 901.895 248.209C906.168 246.011 911.146 249.744 913.884 253.727C922.139 265.674 923.011 281.355 930.395 293.842C937.779 306.328 958.479 313.132 965.739 300.604C969.141 314.667 972.542 328.73 975.944 342.793C977.147 347.688 978.973 353.33 983.743 354.948C989.178 356.814 994.405 352.251 999.3 349.223C1015.02 339.474 1038.54 346.526 1046.34 363.286C1067.79 358.557 1073.1 328.813 1064.64 308.568C1056.17 288.283 1039.33 272.311 1031.45 251.818C1023.57 231.325 1030.91 201.581 1052.69 198.76C1063.77 197.308 1074.68 203.531 1085.84 202.618C1096.99 201.706 1106.45 185.237 1096.46 180.217C1093.68 178.848 1090.32 179.014 1087.62 177.521C1077.25 171.796 1089.73 156.405 1101.35 154.331C1115.58 151.8 1130.56 153.418 1143.87 158.936C1154.78 149.311 1144.41 129.814 1130.39 125.956C1116.37 122.098 1101.68 127.366 1087.25 128.984C1051.9 132.967 1015.06 112.598 999.673 80.531C995.608 72.1097 992.372 62.3195 984.241 57.6733C978.848 54.6035 972.294 54.3961 966.61 51.8655C954.082 46.2652 949.353 31.4139 942.218 19.6739C935.082 7.97546 918.364 -1.73182 908.491 7.8095C900.983 -30.7706 896.088 -77.4401 925.997 -102.911C931.059 -107.226 937.074 -110.835 940.185 -116.684C943.462 -122.907 942.799 -130.332 942.964 -137.343C943.96 -184.51 991.833 -225.04 1038.54 -218.237C1049.66 -216.619 1061.03 -212.802 1071.77 -215.914C1082.56 -219.066 1090.48 -233.793 1082.43 -241.592C1077.41 -246.446 1069.03 -245.948 1063.48 -250.221C1059.45 -253.291 1057.54 -258.31 1055.84 -263.081C1049.12 -281.832 1042.36 -300.582 1035.64 -319.292C1031.99 -329.455 1027.8 -340.324 1018.71 -346.215C1004.4 -355.507 985.734 -342.772 973.538 -349.865C966.61 -353.848 953.418 -383.633 949.726 -391.681C931.805 -430.676 960.014 -477.719 947.569 -518.788C940.102 -543.43 919.941 -563.301 922.057 -590.473C923.674 -611.505 951.635 -641.415 934.336 -661.12C926.537 -670.039 913.096 -670.454 901.273 -670.205C857.341 -669.334 813.41 -668.463 769.478 -667.55C763.38 -667.425 756.867 -667.177 751.806 -663.733C746.745 -660.29 749.856 -655.063 753.756 -650.376L753.549 -650.5Z"
                fill="#BAD19D"
              />
              <path
                d="M661.246 -308.59C651.912 -290.544 642.371 -272.167 627.851 -257.938C617.232 -247.525 604.164 -239.643 594.664 -228.194C585.164 -216.744 579.937 -199.653 587.819 -187C592.258 -179.906 599.974 -175.551 605.699 -169.452C611.424 -163.354 614.991 -153.274 609.598 -146.844C602.754 -152.486 593.129 -143.691 590.225 -135.311C587.322 -126.931 584.584 -116.228 575.913 -114.486C560.564 -111.416 549.405 -141.036 536.172 -132.698C532.853 -130.582 531.277 -126.641 529.783 -122.99C504.602 -60.5984 452.582 -12.8918 397.117 25.232C378.947 37.7187 359.616 49.6661 337.878 53.3996C316.141 57.1332 291.416 50.9521 278.598 33.031C293.2 21.457 308.176 10.4222 323.525 -0.11471C322.737 -10.6516 305.396 -6.37881 296.643 -12.2696C290.669 -16.2935 289.798 -24.5488 286.148 -30.7299C280.05 -41.1009 266.277 -44.7516 254.495 -42.5529C242.714 -40.3542 232.343 -33.5094 222.387 -26.789C228.651 -11.5229 234.417 3.90924 239.727 19.5487C228.236 27.3892 209.776 20.2539 206.581 6.68865C204.549 -1.89853 207.784 -11.5643 203.802 -19.4463C200.151 -26.6645 190.278 -29.9002 183.06 -26.2911C175.842 -22.682 172.482 -12.8918 176.008 -5.63209C168.582 -16.2105 150.744 -13.0163 142.779 -2.85267C134.814 7.3109 133.901 21.1666 133.321 34.0681C133.03 41.0374 133.196 49.1683 138.755 53.4411C131.786 56.5109 125.024 61.2401 122.203 68.3339C119.382 75.4277 122.327 85.0105 129.587 87.2921C134.773 88.9099 140.207 86.6283 145.475 85.2179C162.608 80.6132 182.147 86.4209 193.97 99.6543C185.715 100.567 184.844 112.141 186.296 120.313C190.651 144.416 197.662 172.085 219.939 182.249C246.116 164.286 276.15 152.007 307.387 146.448C314.108 145.245 321.285 144.416 327.632 147.029C342.4 153.127 343.769 175.363 334.02 188.057C324.272 200.751 308.051 206.268 292.785 211.08C266.775 219.294 240.059 227.632 212.804 226.346C185.549 225.06 157.132 212.117 144.978 187.683C135.81 169.306 137.096 147.319 142.198 127.449C134.192 122.678 124.65 131.431 121.124 140.06C117.598 148.688 115.151 159.267 106.646 163.083C100.88 165.697 94.0353 164.12 87.9372 165.78C67.1537 171.38 71.3435 203.779 56.6997 219.585C53.4225 223.152 48.9837 226.056 47.4903 230.661C43.7567 242.069 59.9354 249.577 71.8413 248.582C83.7472 247.586 98.4742 244.848 105.485 254.597C97.6444 263.35 89.4721 272.809 87.8542 284.465C86.2364 296.123 94.6576 309.812 106.356 309.024C116.851 308.319 125.563 296.786 135.768 299.441C141.037 300.81 144.563 305.664 149.333 308.319C163.106 315.91 178.663 303.05 190.569 292.721C202.474 282.391 223.714 275.215 231.43 288.946C220.147 307.24 195.588 310.434 175.344 317.653C155.058 324.829 134.482 346.982 145.766 365.276C151.657 361.211 160.368 361.958 165.512 366.936C152.528 376.228 160.7 399.044 175.676 404.645C190.61 410.245 207.204 404.562 222.138 398.878C231.638 395.269 241.096 391.702 250.596 388.093C254.454 386.641 258.436 385.064 261.216 382.036C268.973 373.449 262.294 359.469 253.583 351.836C244.871 344.202 233.587 337.772 230.601 326.53C227.863 316.284 234.5 304.461 244.664 301.391C254.827 298.321 266.858 304.544 270.259 314.624C271.919 319.561 271.711 324.995 273.744 329.766C278.847 341.506 295.896 343.456 306.848 336.86C317.8 330.264 324.064 318.234 329.747 306.784C311.868 296.828 299.298 274.509 306.931 255.51C314.564 236.552 346.756 232.154 354.804 250.946C359.284 261.359 355.136 273.223 353.435 284.424C350.282 305.456 356.09 326.696 362.644 346.899C369.987 369.591 379.404 393.403 399.109 406.802C418.814 420.201 451.503 416.468 459.924 394.149C461.874 389.047 462.164 382.783 458.763 378.551C455.942 375.067 451.254 373.615 448.06 370.503C441.381 363.99 443.455 352.333 449.221 345.032C454.988 337.731 463.45 333.085 470.42 326.904C484.026 314.915 491.784 296.62 490.996 278.533C474.651 268.328 458.306 258.165 442.003 247.96C436.278 244.392 430.263 240.451 427.691 234.228C424.746 227.01 427.318 218.838 429.973 211.537C436.112 194.694 442.833 178.059 450.051 161.631C452.955 155.035 456.274 148.066 462.413 144.25C476.601 135.455 494.065 148.44 504.976 161.051C513.19 170.509 521.486 183.245 516.384 194.694C508.917 211.454 494.563 219.543 501.74 240.451C505.266 250.656 511.572 259.949 513.273 270.61C515.347 283.553 508.585 295.293 509.249 307.821C509.912 320.349 519.122 329.808 518.043 342.045C517.214 351.379 508.792 359.883 511.406 368.885C514.434 379.422 528.58 380.294 539.325 382.368C550.11 384.401 561.477 397.883 552.765 404.52C565.21 403.981 578.154 402.653 588.856 396.223C599.559 389.793 607.275 376.85 603.957 364.862C601.551 356.15 593.876 348.849 594.415 339.805C595.162 327.899 609.723 321.926 621.629 322.672C633.535 323.419 645.441 328.024 657.139 325.535C668.838 323.046 678.586 307.904 670.331 299.275C665.146 293.841 655.023 293.426 652.493 286.374C648.593 275.505 665.892 271.357 675.517 264.927C689.289 255.8 688.169 234.228 678.96 220.497C669.75 206.766 655.065 197.888 643.325 186.273C639.011 182.042 634.821 177.229 629.137 175.238C616.941 171.007 604.952 181.004 595.079 189.343C585.206 197.64 569.981 204.858 560.398 196.229C556.789 192.993 555.088 188.223 553.471 183.659C544.386 157.607 535.301 131.597 526.216 105.545C523.187 96.8334 520.2 87.0017 524.349 78.7879C532.106 63.4803 556.374 68.4998 568.197 80.9036C580.062 93.3488 587.031 110.772 601.799 119.525C598.605 100.235 603.003 79.7835 613.83 63.5218C618.435 56.5939 624.159 47.0526 618.435 40.9959C616.443 38.8803 613.498 37.9676 610.801 36.8475C594.125 29.9612 583.173 11.2104 585.372 -6.71067C563.593 -2.39634 554.632 37.4698 534.098 29.09C522.606 24.4438 522.441 8.26507 525.386 -3.7653C533.724 -37.9481 553.968 -72.1309 587.031 -84.0783C620.094 -96.0672 664.648 -74.5785 665.768 -39.4416C666.349 -20.6908 655.397 -3.55786 651.954 14.9025C650.004 25.315 650.46 35.9764 650.917 46.5548C652.078 72.7727 653.24 98.9906 654.401 125.208C654.982 138.234 655.978 152.38 664.648 162.088C673.318 171.795 692.525 172.293 697.13 160.097C699.951 152.629 696.217 144.54 693.272 137.156C681.117 106.582 681.864 71.0719 695.304 41.0375C706.713 35.8519 717.706 49.1268 722.186 60.8668C735.046 94.6348 736.249 132.717 725.546 167.232C721.688 179.677 716.295 191.832 715.092 204.816C713.889 217.801 717.955 232.32 729.031 239.207C734.88 219.875 749.441 203.364 767.86 195.068C769.81 205.024 774.663 214.399 781.674 221.742C802.25 212.408 791.838 177.603 808.182 162.005C819.093 151.551 840.332 156.778 845.145 171.09C858.544 169.845 867.961 153.335 862.153 141.18C859.747 136.16 855.391 132.136 853.607 126.826C846.472 105.504 884.222 82.6044 869.496 65.596C859.415 53.939 841.079 65.7204 829.92 76.3403C812.165 93.2658 785.159 108.2 764.458 95.0081C743.011 81.3184 750.188 42.7383 774.29 34.483C798.392 26.2692 826.186 47.0941 829.007 72.3579C837.346 54.6857 845.974 36.5572 859.913 22.826C864.684 18.0968 870.325 13.5336 871.902 6.97909C872.731 3.45296 872.275 -0.239143 871.777 -3.80677C870.367 -14.4267 868.749 -25.5859 862.319 -34.173C855.889 -42.7602 842.987 -47.4894 834.151 -41.4328C830.376 -38.8193 827.68 -34.5879 823.365 -33.0115C813.99 -29.5683 805.818 -40.7275 803.37 -50.4348C800.923 -60.142 798.848 -72.0479 789.515 -75.6155C762.591 -71.7161 759.065 -19.861 732.184 -24.2169C723.721 -25.5858 717.623 -32.8041 712.728 -39.8563C685.971 -78.6439 673.65 -127.139 678.669 -173.974C680.08 -187.042 684.726 -202.266 697.337 -206.124C712.935 -210.895 727.164 -193.472 728.782 -177.251C730.4 -161.031 724.717 -144.769 726.169 -128.508C727.579 -112.287 741.352 -94.6153 757.074 -98.8466C762.508 -100.34 767.238 -104.24 772.838 -104.779C788.892 -106.272 800.591 -80.3862 815.401 -86.8163C827.099 -91.9188 822.619 -109.964 813.99 -119.423C805.403 -128.84 793.58 -139.045 796.276 -151.531C798.848 -163.437 812.829 -168.166 824.278 -172.398C835.728 -176.629 848.588 -186.585 844.813 -198.159C843.07 -203.594 837.926 -207.369 835.769 -212.679C832.077 -221.805 837.429 -234.167 830.335 -241.012C823.614 -247.484 812.704 -242.672 803.37 -242.63C787.482 -242.63 774.829 -261.505 780.886 -276.191C767.404 -262.169 741.974 -266.981 729.487 -281.874C717.001 -296.767 714.885 -317.882 716.835 -337.255C720.983 -378.615 740.605 -416.573 754.792 -455.651C771.884 -502.652 781.384 -552.433 782.794 -602.462C783.126 -614.866 782.794 -628.1 775.783 -638.346C770.556 -646.062 752.967 -655.52 744.878 -646.186C736.249 -636.23 748.736 -634.737 751.432 -625.32C760.683 -592.838 753.507 -552.101 746.703 -519.536C731.022 -444.865 696.051 -375.711 661.288 -308.424L661.246 -308.59Z"
                fill="#889673"
              />
              <path
                d="M1006.69 -249.974C1006.69 -243.004 1005.28 -235.703 1008.01 -229.315C1014.98 -212.887 1038.67 -216.745 1056.22 -213.675C1069.58 -211.352 1081.81 -203.055 1088.91 -191.523C1092.47 -184.719 1085.67 -177.418 1080.86 -171.444C1069.12 -156.967 1067.09 -137.262 1061.9 -119.382C1056.72 -101.502 1044.89 -82.4613 1026.35 -80.7189C1019.21 -80.0137 1011.71 -82.0464 1004.94 -79.5989C990.798 -74.4548 993.619 -48.8592 1008.51 -46.9094C1015.07 -46.0382 1022.53 -48.8592 1027.97 -45.0426C1035.19 -39.9401 1031.95 -28.6564 1034.6 -20.2767C1039.54 -4.84464 1062.03 -4.67872 1076.38 -12.1873C1090.73 -19.6959 1103.97 -32.0166 1120.14 -31.6848C1126.12 -19.5714 1115.13 -5.59134 1103.05 0.423824C1090.98 6.43902 1076.71 8.96954 1067.17 18.4694C1057.63 28.0107 1058.62 48.7942 1071.98 50.7439C1076.34 51.3662 1080.78 49.7898 1085.09 50.4535C1095.34 52.0714 1099.24 64.2677 1102.89 73.9749C1106.54 83.6407 1116.91 94.0947 1125.62 88.4944C1130.39 105.793 1157.15 111.228 1168.31 97.206C1174.9 88.9092 1177.06 75.6758 1187.27 72.7305C1193.16 71.0296 1199.25 73.809 1205.19 75.3439C1218.96 78.9116 1234.97 75.178 1244.02 64.1848C1253.06 53.1915 1252.94 35.0215 1242.27 25.6461C1233.19 17.6397 1218.59 16.5611 1212.03 6.39756C1207.26 -0.986597 1208.51 -10.5694 1206.93 -19.1981C1204.86 -30.7722 1197.6 -40.9772 1195.73 -52.5927C1192.49 -72.7125 1209 -93.7863 1229.33 -95.4872C1232.36 -95.7361 1235.64 -95.5702 1238.13 -93.7863C1243.44 -89.9698 1242.07 -81.922 1240.9 -75.4504C1238.21 -60.6406 1239.91 -45.0841 1245.68 -31.187C1248.37 -24.7155 1253.76 -17.6632 1260.65 -18.7832C1268.91 -20.1522 1270.65 -31.104 1270.4 -39.4423C1270.07 -51.0164 1269.69 -62.6319 1269.36 -74.2059C1275.34 -67.6099 1283.01 -62.5904 1291.47 -59.8109C1299.11 -64.0838 1287.95 -76.4461 1291.81 -84.328C1295.04 -90.9654 1306.41 -87.4393 1308.69 -80.387C1310.93 -73.3347 1307.61 -65.8676 1304.91 -58.9813C1297.57 -40.272 1294.5 -19.9033 1295.95 0.17497C1297.95 27.5959 1308.07 56.0124 1298.32 81.6495C1284.55 117.824 1239.58 129.481 1212.07 156.694C1192.33 176.233 1182.25 203.281 1165.82 225.64C1150.72 246.175 1130.18 262.603 1106.83 272.849C1094.55 278.242 1077.91 280.897 1069.66 270.36C1066.8 266.71 1065.26 261.815 1061.24 259.533C1049.79 253.061 1039.91 274.84 1026.76 273.969C1023.65 273.762 1020.71 272.186 1017.6 271.937C1004.99 270.817 1001.09 291.517 1010.67 299.814C1020.25 308.111 1034.52 306.991 1047.09 305.456C1060.03 303.838 1072.94 302.22 1085.88 300.602C1089.61 300.146 1093.43 299.648 1097.12 300.478C1113.71 304.128 1114.5 327.401 1110.81 343.994C1109.03 352.001 1106.66 360.671 1100.11 365.566C1093.51 370.461 1081.56 368.221 1080.4 360.09C1067.71 370.337 1054.97 380.625 1042.28 390.871C1038.59 393.858 1034.65 397.26 1034.07 401.947C1033.36 407.589 1037.76 412.484 1039.75 417.836C1046.43 435.674 1026.64 458.864 1039.46 472.927C1049.58 484.044 1068.37 475.333 1078.29 464.008C1088.2 452.682 1097.74 437.956 1112.76 437.001C1125.04 436.213 1138.98 445.091 1148.6 437.375C1157.94 429.908 1153.41 413.646 1161.17 404.561C1169.05 395.31 1184.61 399.127 1193.86 407.092C1203.07 415.015 1209.63 426.133 1220.2 432.148C1231.49 438.578 1246.55 437.665 1257 429.991C1267.45 422.275 1272.81 408.212 1270.03 395.517C1268.86 390.208 1266.75 383.86 1270.65 380.085C1272.6 378.177 1275.5 377.721 1277.99 376.601C1287.91 372.079 1289.15 357.809 1284.26 348.06C1279.36 338.353 1270.36 331.425 1263.51 323.003C1241.86 296.412 1245.01 253.061 1270.28 229.872C1274.17 226.304 1279.19 222.986 1284.42 223.857C1291.64 225.06 1295.21 233.149 1297.49 240.077C1303.63 258.703 1309.81 277.33 1315.95 295.956C1318.02 302.178 1320.22 308.691 1325.03 313.172C1332.92 320.514 1345.69 320.058 1355.19 315.039C1364.69 310.019 1371.7 301.39 1378.42 293.011C1384.65 285.253 1391.04 277.081 1392.86 267.29C1394.69 257.5 1390.16 245.802 1380.62 243.064C1377.1 242.068 1373.07 242.234 1370.21 239.952C1361.83 233.232 1374.77 221.368 1376.31 210.706C1377.8 200.543 1368.01 192.329 1365.56 182.331C1362.7 170.508 1371.29 158.146 1382.45 153.334C1393.61 148.522 1406.47 149.725 1418.25 152.629C1462.01 163.539 1502.92 197.141 1546.89 187.143C1553.45 185.65 1559.96 183.078 1564.94 178.556C1581.99 163.041 1574.93 132.219 1591.07 115.749C1602.19 104.424 1619.86 104.175 1635.54 101.645C1651.14 98.9899 1669.14 89.9049 1669.52 74.058C1669.81 62.2351 1659.77 52.5693 1657.74 40.9123C1656.28 32.574 1659.02 24.1942 1660.72 15.9389C1662.42 7.68358 1662.88 -1.73326 1657.74 -8.41219C1652.55 -15.0911 1639.98 -15.6719 1636.83 -7.83144C1644.38 -30.6891 1642.59 -47.1583 1639.48 -58.1101C1633.01 -80.8019 1618.41 -87.5222 1615.92 -113.408C1614.76 -125.356 1617.37 -129.089 1614.14 -139.958C1609.41 -155.763 1596.67 -171.984 1589.99 -169.951C1576.01 -165.761 1591.82 -83.0835 1575.43 -78.6447C1574.6 -78.4372 1572.32 -78.1883 1568.05 -79.101C1560.95 -80.5944 1553.94 -84.2865 1546.72 -83.4153C1526.69 -81.0922 1525.49 -50.5185 1509.18 -38.6125C1501.3 -32.8463 1490.72 -32.2655 1482.13 -27.6608C1455.54 -13.4733 1459.73 28.6745 1437.12 48.6283C1434.8 50.7025 1431.86 52.5278 1428.79 52.0714C1426.13 51.6566 1424.06 49.5824 1422.4 47.4667C1409.79 31.4539 1409.16 9.13549 1412.11 -11.0257C1415.05 -31.187 1420.99 -51.2238 1419.37 -71.5095C1418.08 -87.6467 1408.21 -106.107 1392.03 -106.024C1386.85 -106.024 1381.54 -104.033 1376.6 -105.651C1367.93 -108.555 1366.44 -120.046 1360.75 -127.181C1352 -138.299 1335.36 -137.303 1321.3 -138.548C1274.05 -142.82 1238.66 -181.898 1206.35 -216.621C1168.14 -257.648 1127.4 -296.187 1086.71 -334.684C1066.75 -353.559 1044.19 -373.554 1016.73 -374.343C1012.54 -374.467 1008.06 -373.969 1004.9 -371.231C1002.41 -369.074 1001.21 -365.88 1000.05 -362.81C993.66 -345.802 975.034 -315.726 980.385 -297.763C985.944 -279.22 1006.73 -273.951 1006.73 -249.766L1006.69 -249.974Z"
                fill="#889673"
              />
              <path
                d="M1335.24 -87.7715C1352.95 -70.5141 1345.19 -56.4095 1361.83 -19.4887C1376.97 14.0718 1397.46 48.9184 1431.89 62.0273C1436.37 63.7282 1441.31 65.0142 1445.87 63.6037C1450.48 62.1932 1453.8 58.2938 1457.41 55.141C1468.61 45.2263 1484.74 41.2024 1499.31 44.5626C1512.95 47.7568 1525.11 56.9663 1539.09 57.5056C1562.73 58.4182 1579.41 35.4361 1591.48 15.1089C1595.63 8.13962 1599.9 0.630998 1599.32 -7.45838C1598.95 -12.6854 1596.59 -17.539 1595.67 -22.683C1591.15 -48.0297 1621.23 -66.905 1624.92 -92.3762C1626.08 -100.507 1623.47 -110.214 1615.88 -113.409C1612.14 -114.985 1607.79 -114.695 1604.09 -116.437C1586.17 -124.858 1607.33 -160.534 1589.91 -169.951C1582.69 -173.851 1569.91 -162.318 1561.82 -155.1C1544.11 -139.253 1534.53 -121.125 1529.22 -108.057C1519.88 -95.5704 1509.88 -89.7627 1503.87 -86.9832C1471.51 -72.0905 1436.42 -90.8413 1426.46 -96.1512C1416.38 -101.544 1416.13 -103.577 1402.07 -113.326C1375.39 -131.786 1353.28 -140.415 1335.9 -147.84C1252.6 -183.351 1222.03 -214.795 1209.41 -203.512C1200 -195.049 1207.34 -168.748 1218.38 -152.694C1223.56 -145.144 1231.86 -136.515 1289.94 -110.297C1324.53 -94.6993 1327.73 -94.9897 1335.15 -87.73L1335.24 -87.7715Z"
                fill="#BAD19D"
              />
            </g>
          </g>
        </svg>
        <div
          style={{
            backgroundImage:
              "linear-gradient(107deg, #F6B79D -0.43%, #F8D66E 48.74%, #F7C6EC 100%)",
            display: "flex",
            flexDirection: "column",
            padding: "8px",
            borderRadius: "4px",
            justifyContent: "center",
            width: "95%",
          }}
        > */}
          {/* <div
            style={{
              backgroundColor: "#FFFDED",
              borderRadius: "32px",
              padding: "30px",
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h2
              style={{ marginBottom: "40px", marginTop: "40px", fontSize: 26 }}
            >
              {roundData?.metadata?.name}
            </h2>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                maxWidth: "100%",
                marginBottom: "36px",
                marginTop: "40px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 18,
                  width: !!matchingCapPercent ? "25%" : "33.33%",
                }}
              >
                <p style={{ color: "#F17A4C", fontSize: 24, maxWidth: 160 }}>
                  {formatAmount(tokenAmount, true)}{" "}
                  {roundData?.matchingFundPayoutToken.name} (${" "}
                  {formatAmount(roundData?.matchingPoolUSD || 0)})
                </p>

                <span style={{ fontSize: 18 }}>Matching Pool</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 18,
                  justifyContent: "space-between",
                  width: !!matchingCapPercent ? "25%" : "33.33%",
                }}
              >
                <p style={{ color: "#F17A4C", fontSize: 24 }}>
                  ${" "}
                  {!!roundData?.amountUSD &&
                    formatAmount(roundData.amountUSD.toFixed(2))}
                </p>
                <span style={{ fontSize: 18 }}>Total USD Crowdfunded</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  fontSize: 18,
                  width: !!matchingCapPercent ? "25%" : "33.33%",
                }}
              >
                <p style={{ color: "#F17A4C", fontSize: 24 }}>
                  {dayjs.unix(Number(roundData?.roundEndTime)).format("lll")}
                </p>
                <span style={{ fontSize: 18 }}>Round ended on</span>
              </div>

              {!!matchingCapPercent && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    fontSize: 18,
                    width: !!matchingCapPercent ? "25%" : "33.33%",
                  }}
                >
                  <p style={{ color: "#F17A4C", fontSize: 24 }}>
                    {matchingCapPercent.toFixed()}% (
                    {formatAmount(matchingCapTokenValue, true)}{" "}
                    {roundData?.matchingFundPayoutToken.name})
                  </p>
                  <span style={{ fontSize: 18 }}>Matching Cap</span>
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                maxWidth: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 18,
                  width: !!matchingCapPercent ? "25%" : "33.33%",
                }}
              >
                <p style={{ color: "#F17A4C", fontSize: 24 }}>
                  {formatAmount(applications?.length || 0, true)}
                </p>
                <span style={{ fontSize: 18 }}>Total Projects</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 18,
                  width: !!matchingCapPercent ? "25%" : "33.33%",
                }}
              >
                <p style={{ color: "#F17A4C", fontSize: 24 }}>
                  {formatAmount(roundData?.votes || 0, true)}
                </p>
                <span style={{ fontSize: 18 }}>Total Donations</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 18,
                  width: !!matchingCapPercent ? "25%" : "33.33%",
                }}
              >
                <p style={{ color: "#F17A4C", fontSize: 24 }}>
                  {formatAmount(roundData?.uniqueContributors || 0, true)}
                </p>
                <span style={{ fontSize: 18 }}>Total Donors</span>
              </div>

              {!!matchingCapPercent && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    fontSize: 18,
                    width: !!matchingCapPercent ? "25%" : "33.33%",
                  }}
                >
                  <p style={{ color: "#F17A4C", fontSize: 24 }}>
                    {projectsReachedMachingCap}
                  </p>
                  <span style={{ fontSize: 18, maxWidth: 200 }}>
                    {" "}
                    {projectsReachedMachingCap == 1
                      ? "Project"
                      : "Projects"}{" "}
                    Reaching Matching Cap
                  </span>
                </div>
              )}
            </div>
          </div>
        </div> */}
      </div>
    ),
    {
      width: 1200,
      height: 600,
    }
  );
}
